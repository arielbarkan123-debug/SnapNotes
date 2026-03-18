import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '@/lib/ai/claude';
import { Sandbox } from '@e2b/code-interpreter';
import { generateRecraftImage, type RecraftStyle } from './recraft-client';
import { createLogger } from '@/lib/logger'
import {
  generateLabelContent,
  mapLabelsToImage,
  verifyLabelPlacement,
  computeLabelPositions,
  uploadBaseImage,
} from './label-pipeline'
import { generateDiagramHash } from './step-capture/upload-steps'

const log = createLogger('diagram:recraft-executor')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Custom E2B template ID with texlive-full pre-installed
const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined;

import type { OverlayLabel, RecraftStepMeta } from '@/types'
export type { OverlayLabel, RecraftStepMeta }

export interface RecraftResult {
  imageUrl: string;
  /** Original Recraft image URL before label compositing (for progressive step capture) */
  baseImageUrl?: string;
  /** Labels used in compositing (for progressive step capture) */
  labels?: OverlayLabel[];
  /** Step-by-step teaching explanations for text-based walkthrough */
  stepMetadata?: RecraftStepMeta[];
}

export interface RecraftError {
  error: string;
}

// Topics that benefit from 3D cutaway rendering
const NEEDS_3D = /\b(anatomy|cross.?section|cutaway|internal structure|inside of|layers of|interior|dissect)/i;

// Topics that are best as clean 2D digital illustration
const PREFERS_2D = /\b(cycle|process|chain|web|flow|stages|system|ecosystem|solar system|planet|molecule|atom|dna|rna|cell|photosynthesis|respiration|mitosis|meiosis|tectonic|volcano|rock cycle|water cycle|carbon cycle|nitrogen cycle|food chain|food web|life cycle|circuit)/i;

/**
 * Determine the best Recraft style and prompt strategy for a topic.
 */
function classifyTopic(question: string): { style: RecraftStyle; is3D: boolean } {
  const lower = question.toLowerCase();

  if (NEEDS_3D.test(lower)) {
    return { style: 'realistic_image', is3D: true };
  }

  if (PREFERS_2D.test(lower)) {
    return { style: 'digital_illustration', is3D: false };
  }

  // Default to digital_illustration — cleaner for educational content
  return { style: 'digital_illustration', is3D: false };
}

const REWRITE_PROMPT_2D = `You are an expert at writing image generation prompts for educational illustrations.

Rewrite the student's question into a prompt for a CLEAN 2D ILLUSTRATION. Max 500 characters.

CRITICAL: The image must contain ZERO text. No letters, numbers, labels, annotations, or writing of any kind. Labels will be added as a separate overlay AFTER the image is generated. The image is ONLY the visual — pure illustration, nothing else.

STYLE RULES:
- Flat, clean 2D digital illustration with bold outlines and flat colors
- Simple vector-like shapes, clear distinct colors for each part/stage/component
- Show ALL key parts of the subject, each visually distinct and identifiable
- Pure solid white background, no decorative elements
- No 3D effects, no shadows, no perspective

STRUCTURE:
- Cycles → circular flow with arrows between stages
- Systems → components arranged showing their spatial relationship
- Chains → connected stages left-to-right or top-to-bottom
- Anatomy → cross-section showing internal parts in distinct colors

DO NOT include words like "labeled", "annotated", "with text", "with names" in the prompt. The image must be purely visual.

EXAMPLES:
- "plant cell" → "Clean 2D cross-section of a plant cell showing cell wall, membrane, nucleus, chloroplasts, mitochondria, vacuole, each organelle in a distinct color with bold outlines, flat style, white background"
- "water cycle" → "Flat 2D illustration of the water cycle showing ocean, rising water vapor, cloud formation, rain falling on mountains, rivers flowing back to ocean, each stage in distinct blue tones, arrows showing flow direction, white background"
- "food chain" → "Clean 2D illustration of a forest food chain with sun, grass, grasshopper, frog, snake, eagle connected by arrows, each organism clearly drawn in distinct colors, white background"

Original question: "{QUESTION}"

Return ONLY the rewritten prompt. Do NOT include "no text" or "no labels" — that is handled separately.`;

const REWRITE_PROMPT_3D = `You are an expert at writing image generation prompts for educational 3D models.

Rewrite the student's question into a prompt for a photorealistic 3D CUTAWAY MODEL. Max 500 characters.

CRITICAL: The image must contain ZERO text. No letters, numbers, labels, annotations, or writing of any kind. Labels will be added as a separate overlay AFTER the image is generated. The image is ONLY the visual — pure 3D model, nothing else.

STYLE RULES:
- Photorealistic 3D cutaway model, like a museum exhibit piece or medical teaching model
- Clean cross-section cut revealing internal layers, organs, or components
- Vibrant distinct colors for each part — easy to distinguish visually
- Studio product photography lighting, isolated on pure solid white background
- No surroundings, table, surface, props, or environment

EXAMPLES:
- "anatomy of the heart" → "Photorealistic 3D cutaway medical model of the human heart showing chambers, valves, aorta, and blood vessels in distinct red and blue tones, clean cross-section revealing interior structure, studio lighting, pure white background"
- "inside of a volcano" → "Photorealistic 3D cutaway geological model of a volcano showing magma chamber, conduit, lava flow, layers of rock and ash, cross-section view, studio lighting, pure white background"

Original question: "{QUESTION}"

Return ONLY the rewritten prompt. Do NOT include "no text" or "no labels" — that is handled separately.`;

const VISION_LABELING_PROMPT = `You are an expert scientific illustrator placing precise labels on an educational image.

The student asked: "{QUESTION}"

Your job: identify every key structure/component visible in this image and place labels for a student to learn from.

For each label provide:
1. "text" — the correct scientific/educational name (concise: 1-3 words max)
2. "x", "y" — where the label TEXT goes (percentage from top-left corner)
3. "targetX", "targetY" — where the leader line POINTS TO on the actual structure (percentage)

LABEL PLACEMENT RULES:
- Place labels OUTSIDE the main illustration, in the margins
- Left-side labels: x between 2–12
- Right-side labels: x between 88–98
- Top labels: y between 2–10
- Bottom labels: y between 90–98
- Distribute labels evenly around ALL four sides — don't cluster them all on one side
- Each label's y should be spaced at least 6 units from the next label on the same side
- The leader line (x,y → targetX,targetY) must point to the CENTER of the actual structure in the image
- targetX and targetY should be where the structure actually IS in the image (typically 25–75 range)

CONTENT RULES:
- Use correct scientific terminology appropriate for a student
- Label ALL major visible structures (typically 6–12 labels for a complete diagram)
- Be specific: "Left Atrium" not just "Chamber", "Cornea" not just "Front part"
- If a structure has sub-parts visible, label the most important ones
- Order labels clockwise starting from top-left for consistency

Return ONLY a valid JSON array. No explanation, no markdown fences, no text before or after:
[{"text": "Cornea", "x": 5, "y": 15, "targetX": 38, "targetY": 42}]`;

/**
 * Generate a realistic/illustrated diagram via Recraft + Claude Vision labeling.
 *
 * Pipeline:
 * 1. Classify topic → pick 2D illustration or 3D cutaway
 * 2. Claude rewrites the question into an optimal image generation prompt
 * 3. Recraft generates the image (no text, no labels, clean background)
 * 4. Claude Vision analyzes the image and places educational labels as JSON overlay
 */
export async function generateRecraftDiagram(
  question: string,
  userId?: string,
  skipVerification?: boolean,
): Promise<RecraftResult | RecraftError> {
  const pipelineVersion = process.env.RECRAFT_PIPELINE_VERSION || 'v1'

  if (pipelineVersion === 'v2' && userId) {
    return generateRecraftDiagramV2(question, userId, skipVerification)
  }

  log.info(`generateRecraftDiagram called with: "${question.slice(0, 80)}..."`);

  const { style, is3D } = classifyTopic(question);
  const rewriteTemplate = is3D ? REWRITE_PROMPT_3D : REWRITE_PROMPT_2D;

  log.info(`Style: ${style}, 3D: ${is3D}`);

  // Step 1: Rewrite prompt for clean image generation
  let cleanPrompt: string;
  try {
    const rewriteMsg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: rewriteTemplate.replace('{QUESTION}', question),
        },
      ],
    });
    const rewriteText = rewriteMsg.content.find((b) => b.type === 'text');
    cleanPrompt =
      rewriteText && rewriteText.type === 'text'
        ? rewriteText.text.trim().slice(0, 950)
        : buildFallbackPrompt(question, is3D);
  } catch {
    cleanPrompt = buildFallbackPrompt(question, is3D);
  }

  log.info(`Prompt: ${cleanPrompt.slice(0, 120)}...`);

  // Step 2: Generate image with Recraft (no_text is ALWAYS enforced in the client)
  let imageUrl: string;
  try {
    const image = await generateRecraftImage({
      prompt: cleanPrompt,
      style,
      size: '1024x1024',
      format: 'png',
      negative_prompt: 'callout lines, leader lines, pointer dots, annotation markers, reference lines, label dots, numbered markers, indicator lines',
    });
    imageUrl = image.url;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Recraft generation failed',
    };
  }

  // Step 3: Claude Vision identifies label positions
  let labels: OverlayLabel[] | undefined;
  try {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const mediaType = (
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(contentType)
        ? contentType
        : 'image/jpeg'
    ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const visionMessage = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: VISION_LABELING_PROMPT.replace(/\{QUESTION\}/g, question),
            },
          ],
        },
      ],
    });

    const visionText = visionMessage.content.find((b) => b.type === 'text');
    if (visionText && visionText.type === 'text') {
      let jsonStr = visionText.text.trim();
      // Strip markdown fences if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      // Find the JSON array even if there's text around it
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) jsonStr = arrayMatch[0];
      const parsed = JSON.parse(jsonStr) as OverlayLabel[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text) {
        labels = parsed;
      }
    }
  } catch (err) {
    log.error({ detail: err }, 'Vision labeling error');
    // Still return the image without labels
  }

  // Step 4: Fix label collisions before compositing
  if (labels && labels.length > 0) {
    labels = fixLabelCollisions(labels);
  }

  // Step 5: Generate step-by-step teaching explanations (for text-based walkthrough)
  const stepMetadata = await generateStepMetadata(question);

  // Step 6: Composite labels using TikZ (text is ONLY added via TikZ, never by Recraft)
  if (labels && labels.length > 0) {
    log.info(`Compositing ${labels.length} labels via TikZ...`);
    const compositedUrl = await compositeWithTikzLabels(imageUrl, labels);
    if (compositedUrl) {
      log.info('TikZ composite successful');
      return { imageUrl: compositedUrl, baseImageUrl: imageUrl, labels, stepMetadata };
    }
    log.info('TikZ composite failed, returning base image without labels');
  }

  // Return base image if no labels or compositing failed
  return { imageUrl, baseImageUrl: imageUrl, labels, stepMetadata };
}

/**
 * Shared helper: Generate step-by-step teaching explanations via Claude.
 * Used by both v1 and v2 pipelines. Returns undefined on failure (non-blocking).
 */
async function generateStepMetadata(question: string): Promise<RecraftStepMeta[] | undefined> {
  try {
    const stepsMsg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Break this educational diagram topic into 3-6 teaching steps, in the order a teacher would explain it on a whiteboard. Each step should explain one component or concept visible in the diagram.

Topic: "${question}"

Return ONLY a valid JSON array, no other text:
[{"step":1,"label":"English label","labelHe":"תווית בעברית","explanation":"English explanation with $LaTeX$ math if relevant","explanationHe":"הסבר בעברית עם $LaTeX$ אם רלוונטי"}]`,
      }],
    });

    const stepsText = stepsMsg.content.find(b => b.type === 'text');
    if (stepsText && stepsText.type === 'text') {
      let jsonStr = stepsText.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) jsonStr = arrayMatch[0];
      const parsed = JSON.parse(jsonStr) as RecraftStepMeta[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].label) {
        // Ensure all required fields exist (AI may omit Hebrew translations)
        const result = parsed.map((s, i) => ({
          step: s.step ?? i + 1,
          label: s.label || `Step ${i + 1}`,
          labelHe: s.labelHe || s.label || `שלב ${i + 1}`,
          explanation: s.explanation || '',
          explanationHe: s.explanationHe || s.explanation || '',
        }));
        log.info(`Generated ${result.length} step explanations for recraft diagram`);
        return result;
      }
    }
  } catch (err) {
    log.warn({ err }, 'Step metadata generation failed (non-blocking)');
  }
  return undefined;
}

/**
 * V2 Pipeline: Smart Label Pipeline behind RECRAFT_PIPELINE_VERSION=v2 flag.
 *
 * Flow:
 * Phase 1 (parallel): generateLabelContent + generateRecraftImage
 * Upload: base image → Supabase permanent URL
 * Phase 2: mapLabelsToImage (Vision maps labels to image coordinates)
 * Compute: computeLabelPositions (collision avoidance)
 * Phase 3 (optional): verifyLabelPlacement (second Vision pass)
 * Step metadata: reuse shared generateStepMetadata helper
 */
async function generateRecraftDiagramV2(
  question: string,
  userId: string,
  skipVerification?: boolean,
): Promise<RecraftResult | RecraftError> {
  log.info(`[v2] generateRecraftDiagramV2 called with: "${question.slice(0, 80)}..."`);

  const { style, is3D } = classifyTopic(question);
  const rewriteTemplate = is3D ? REWRITE_PROMPT_3D : REWRITE_PROMPT_2D;

  log.info(`[v2] Style: ${style}, 3D: ${is3D}`);

  // Step 1: Rewrite prompt for clean image generation (same as v1)
  let cleanPrompt: string;
  try {
    const rewriteMsg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: rewriteTemplate.replace('{QUESTION}', question),
        },
      ],
    });
    const rewriteText = rewriteMsg.content.find((b) => b.type === 'text');
    cleanPrompt =
      rewriteText && rewriteText.type === 'text'
        ? rewriteText.text.trim().slice(0, 950)
        : buildFallbackPrompt(question, is3D);
  } catch {
    cleanPrompt = buildFallbackPrompt(question, is3D);
  }

  log.info(`[v2] Prompt: ${cleanPrompt.slice(0, 120)}...`);

  // Phase 1 (parallel): Label content generation + Recraft image generation
  const [labelResult, imageResult] = await Promise.allSettled([
    generateLabelContent(question),
    generateRecraftImage({
      prompt: cleanPrompt,
      style,
      size: '1024x1024',
      format: 'png',
      negative_prompt: 'callout lines, leader lines, pointer dots, annotation markers, reference lines, label dots, numbered markers, indicator lines',
    }),
  ]);

  // Extract label content (graceful degradation — empty array on failure)
  const labelContent = labelResult.status === 'fulfilled' ? labelResult.value : [];
  if (labelResult.status === 'rejected') {
    log.warn({ err: labelResult.reason }, '[v2] Label content generation failed');
  }

  // Extract image URL (fatal — cannot proceed without image)
  if (imageResult.status === 'rejected') {
    const errMsg = imageResult.reason instanceof Error
      ? imageResult.reason.message
      : 'Recraft generation failed';
    return { error: errMsg };
  }
  const recraftImageUrl = imageResult.value.url;

  log.info(`[v2] Phase 1 complete: ${labelContent.length} labels, image ready`);

  // Upload base image to Supabase for permanent URL
  const diagramHash = generateDiagramHash(question, 'recraft-v2');
  const permanentUrl = await uploadBaseImage(recraftImageUrl, userId, diagramHash);
  // Use permanent URL if upload succeeded, fall back to Recraft CDN URL
  const baseImageUrl = permanentUrl || recraftImageUrl;

  log.info(`[v2] Base image URL: ${permanentUrl ? 'Supabase' : 'Recraft CDN (fallback)'}`);

  // Phase 2: Map labels to image coordinates via Vision
  let overlayLabels: OverlayLabel[] = [];
  if (labelContent.length > 0) {
    const visionResults = await mapLabelsToImage(baseImageUrl, labelContent, question);

    // Compute label text positions with collision avoidance
    overlayLabels = computeLabelPositions(visionResults, labelContent);
    log.info(`[v2] Phase 2 complete: ${overlayLabels.length} positioned labels`);
  }

  // Phase 3 (optional): Verify label placement with second Vision pass
  if (!skipVerification && overlayLabels.length > 0) {
    overlayLabels = await verifyLabelPlacement(baseImageUrl, overlayLabels);
    // Recompute positions after verification corrections
    overlayLabels = fixLabelCollisions(overlayLabels);
    log.info(`[v2] Phase 3 complete: verification done`);
  }

  // Generate step metadata (shared with v1)
  const stepMetadata = await generateStepMetadata(question);

  // Composite labels using TikZ (same as v1)
  if (overlayLabels.length > 0) {
    log.info(`[v2] Compositing ${overlayLabels.length} labels via TikZ...`);
    const compositedUrl = await compositeWithTikzLabels(recraftImageUrl, overlayLabels);
    if (compositedUrl) {
      log.info('[v2] TikZ composite successful');
      return {
        imageUrl: compositedUrl,
        baseImageUrl: recraftImageUrl,
        labels: overlayLabels,
        stepMetadata,
      };
    }
    log.info('[v2] TikZ composite failed, returning base image with label data');
  }

  // Return base image with label data even if compositing failed
  return {
    imageUrl: recraftImageUrl,
    baseImageUrl: recraftImageUrl,
    labels: overlayLabels.length > 0 ? overlayLabels : undefined,
    stepMetadata,
  };
}

/**
 * Fix label collisions by ensuring labels don't overlap and aren't cut off at edges.
 * 1. Clamp all positions to safe margins (2-98 range)
 * 2. Sort labels by y position
 * 3. If two labels on the same side are within 6 units, spread them apart
 */
function fixLabelCollisions(labels: OverlayLabel[]): OverlayLabel[] {
  // Clamp positions to safe margins
  const clamped = labels.map(label => ({
    ...label,
    x: Math.max(2, Math.min(98, label.x)),
    y: Math.max(2, Math.min(98, label.y)),
    targetX: Math.max(5, Math.min(95, label.targetX)),
    targetY: Math.max(5, Math.min(95, label.targetY)),
  }));

  // Separate into left-side and right-side labels
  const leftLabels = clamped.filter(l => l.x < 50).sort((a, b) => a.y - b.y);
  const rightLabels = clamped.filter(l => l.x >= 50).sort((a, b) => a.y - b.y);

  // Spread labels that are too close on the same side
  function spreadLabels(group: OverlayLabel[], minGap: number): void {
    for (let i = 1; i < group.length; i++) {
      const gap = group[i].y - group[i - 1].y;
      if (gap < minGap) {
        // Push the current label down
        group[i].y = Math.min(98, group[i - 1].y + minGap);
      }
    }

    // If pushing down caused labels to go past 98, push earlier ones up
    // Stop as soon as the gap is satisfied to avoid displacing correctly-placed labels
    for (let i = group.length - 2; i >= 0; i--) {
      if (group[i + 1].y - group[i].y < minGap) {
        group[i].y = Math.max(2, group[i + 1].y - minGap);
      } else {
        break; // Gap satisfied — no need to adjust earlier labels
      }
    }
  }

  spreadLabels(leftLabels, 6);
  spreadLabels(rightLabels, 6);

  return [...leftLabels, ...rightLabels];
}

function buildFallbackPrompt(question: string, is3D: boolean): string {
  if (is3D) {
    return `Photorealistic 3D cutaway model of ${question}, showing internal structure with distinct colors for each component, studio lighting, pure white background`.slice(0, 950);
  }
  return `Clean 2D digital illustration of ${question}, flat style, bold outlines, distinct colors for each component, white background`.slice(0, 950);
}

/**
 * Escape special LaTeX characters in label text.
 */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Composite a Recraft image with TikZ-rendered labels using E2B.
 * Downloads the Recraft image, creates TikZ overlay with labels, compiles to PNG.
 */
async function compositeWithTikzLabels(
  imageUrl: string,
  labels: OverlayLabel[]
): Promise<string | null> {
  if (!LATEX_TEMPLATE_ID) {
    log.error('E2B_LATEX_TEMPLATE_ID not set');
    return null;
  }

  if (!labels || labels.length === 0) {
    log.info('No labels to add');
    return null;
  }

  const sandbox = await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 120000 });

  try {
    // Wait for sandbox kernel to be ready
    await sandbox.runCode('print("ready")', { timeoutMs: 30000 });

    // Download the Recraft image to the sandbox
    const downloadResult = await sandbox.runCode(
      `import urllib.request
import os

url = "${imageUrl}"
output_path = "/tmp/recraft_base.png"

try:
    urllib.request.urlretrieve(url, output_path)
    print(f"Downloaded: {os.path.getsize(output_path)} bytes")
except Exception as e:
    print(f"DOWNLOAD_ERROR: {e}")`,
      { timeoutMs: 30000 }
    );

    const downloadOutput = downloadResult.logs.stdout.join('');
    if (downloadOutput.includes('DOWNLOAD_ERROR')) {
      log.error({ detail: downloadOutput }, 'Failed to download Recraft image');
      return null;
    }

    // Generate TikZ code for labels
    // Coordinates are in percentage (0-100), convert to cm on a 10x10 grid
    const labelNodes = labels.map((label, i) => {
      const labelX = (label.x / 100) * 10;
      const labelY = 10 - (label.y / 100) * 10; // Flip Y axis (TikZ origin is bottom-left)
      const targetX = (label.targetX / 100) * 10;
      const targetY = 10 - (label.targetY / 100) * 10;
      const escapedText = escapeLatex(label.text);

      return `
    % Label ${i + 1}: ${label.text}
    \\draw[line width=0.4pt, color=gray!70] (${targetX.toFixed(2)}, ${targetY.toFixed(2)}) -- (${labelX.toFixed(2)}, ${labelY.toFixed(2)});
    \\fill[color=gray!70] (${targetX.toFixed(2)}, ${targetY.toFixed(2)}) circle (0.06);
    \\node[fill=white, fill opacity=0.85, text opacity=1, inner sep=1.5pt, font=\\scriptsize\\sffamily] at (${labelX.toFixed(2)}, ${labelY.toFixed(2)}) {${escapedText}};`;
    }).join('\n');

    const tikzCode = `\\documentclass[border=0pt]{standalone}
\\usepackage{tikz}
\\usepackage{graphicx}
\\begin{document}
\\begin{tikzpicture}
    % Include the Recraft base image
    \\node[anchor=south west, inner sep=0] at (0,0) {\\includegraphics[width=10cm, height=10cm]{/tmp/recraft_base.png}};

    % Add labels with leader lines
${labelNodes}
\\end{tikzpicture}
\\end{document}`;

    // Write the TikZ file
    await sandbox.files.write('/tmp/diagram.tex', tikzCode);

    // Compile with pdflatex
    const compileResult = await sandbox.runCode(
      `import subprocess
import os

os.chdir('/tmp')
result = subprocess.run(
    ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', 'diagram.tex'],
    capture_output=True, text=True, timeout=30
)

if result.returncode != 0:
    lines = result.stdout.split('\\n')
    error_lines = [l for l in lines if l.startswith('!') or 'Error' in l or 'Undefined' in l or l.startswith('l.')]
    error_msg = '\\n'.join(error_lines[:15]) if error_lines else result.stdout[-2000:]
    print(f"LATEX_ERROR: {error_msg}")
else:
    print("COMPILE_OK")`,
      { timeoutMs: 30000 }
    );

    const compileOutput = compileResult.logs.stdout.join('');
    if (compileOutput.includes('LATEX_ERROR')) {
      log.error({ detail: compileOutput }, 'LaTeX compilation failed');
      return null;
    }

    // Convert PDF to PNG
    const convertResult = await sandbox.runCode(
      `import subprocess
import base64

result = subprocess.run([
    'convert', '-density', '300', '-quality', '100',
    '-background', 'white', '-alpha', 'remove',
    '-trim', '+repage',
    '/tmp/diagram.pdf', '/tmp/diagram.png'
], capture_output=True, text=True, timeout=30)

if result.returncode != 0:
    print(f"CONVERT_ERROR: {result.stderr}")
else:
    # Read and output base64
    with open('/tmp/diagram.png', 'rb') as f:
        data = base64.b64encode(f.read()).decode('utf-8')
        print(f"BASE64:{data}")`,
      { timeoutMs: 30000 }
    );

    const convertOutput = convertResult.logs.stdout.join('');
    if (convertOutput.includes('CONVERT_ERROR')) {
      log.error({ detail: convertOutput }, 'PDF conversion failed');
      return null;
    }

    const base64Match = convertOutput.match(/BASE64:(.+)/);
    if (base64Match) {
      const base64Data = base64Match[1];
      return `data:image/png;base64,${base64Data}`;
    }

    return null;
  } catch (err) {
    log.error({ detail: err }, 'Error');
    return null;
  } finally {
    await sandbox.kill();
  }
}
