import type { TikzTemplate } from '../index'

export const INPUT_OUTPUT_TABLE_TEMPLATE: TikzTemplate = {
  id: 'input-output-table',
  name: 'Input/Output Table',
  keywords: [
    'input output', 'function machine', 'in out table',
    'rule table', 'number machine', 'what is the rule',
    'input output table', 'function table',
  ],
  gradeRange: [2, 5],
  topics: [164],
  category: 'input-output-table',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.1]
  % === TITLE ===
  \\node[font=\\normalsize\\bfseries] at (4,5.5) {Function Machine};
  % === MACHINE BODY ===
  \\draw[very thick, fill=gray!15, rounded corners=5pt] (1.5,1.5) rectangle (6.5,4.5);
  % Gear decorations on top
  \\draw[thick, fill=gray!30] (3.0,4.5) circle (0.4);
  \\draw[thick] (3.0,4.9) -- (3.0,4.5);
  \\draw[thick] (2.6,4.5) -- (3.4,4.5);
  \\draw[thick] (2.7,4.8) -- (3.3,4.2);
  \\draw[thick] (2.7,4.2) -- (3.3,4.8);
  \\draw[thick, fill=gray!30] (5.0,4.5) circle (0.35);
  \\draw[thick] (5.0,4.85) -- (5.0,4.15);
  \\draw[thick] (4.65,4.5) -- (5.35,4.5);
  \\draw[thick] (4.72,4.75) -- (5.28,4.25);
  \\draw[thick] (4.72,4.25) -- (5.28,4.75);
  % Rule label inside machine
  \\node[font=\\large\\bfseries, fill=yellow!25, draw=orange!60, rounded corners=3pt, inner sep=6pt] at (4,3.0) {Rule: $\\times$ 3};
  % === INPUT ARROW (left side) ===
  \\draw[very thick, blue!70, -{Stealth[length=4mm]}] (-0.5,3.0) -- (1.5,3.0);
  \\node[font=\\footnotesize\\bfseries, blue!70!black, above=2pt] at (0.5,3.0) {INPUT};
  % Input funnel shape
  \\draw[thick, fill=blue!15] (1.2,3.6) -- (1.5,3.3) -- (1.5,2.7) -- (1.2,2.4) -- cycle;
  % === OUTPUT ARROW (right side) ===
  \\draw[very thick, red!70, -{Stealth[length=4mm]}] (6.5,3.0) -- (8.5,3.0);
  \\node[font=\\footnotesize\\bfseries, red!70!black, above=2pt] at (7.5,3.0) {OUTPUT};
  % Output chute shape
  \\draw[thick, fill=red!15] (6.8,3.6) -- (6.5,3.3) -- (6.5,2.7) -- (6.8,2.4) -- cycle;
  % === TABLE BELOW ===
  % Table header
  \\draw[very thick, fill=blue!20] (1.5,-0.5) rectangle (4,-0.0);
  \\node[font=\\footnotesize\\bfseries] at (2.75,-0.25) {Input};
  \\draw[very thick, fill=red!20] (4,-0.5) rectangle (6.5,-0.0);
  \\node[font=\\footnotesize\\bfseries] at (5.25,-0.25) {Output};
  % Row 1
  \\draw[thick, fill=blue!8] (1.5,-1.0) rectangle (4,-0.5);
  \\node[font=\\footnotesize\\bfseries] at (2.75,-0.75) {1};
  \\draw[thick, fill=red!8] (4,-1.0) rectangle (6.5,-0.5);
  \\node[font=\\footnotesize\\bfseries] at (5.25,-0.75) {3};
  % Row 2
  \\draw[thick, fill=blue!8] (1.5,-1.5) rectangle (4,-1.0);
  \\node[font=\\footnotesize\\bfseries] at (2.75,-1.25) {2};
  \\draw[thick, fill=red!8] (4,-1.5) rectangle (6.5,-1.0);
  \\node[font=\\footnotesize\\bfseries] at (5.25,-1.25) {6};
  % Row 3
  \\draw[thick, fill=blue!8] (1.5,-2.0) rectangle (4,-1.5);
  \\node[font=\\footnotesize\\bfseries] at (2.75,-1.75) {3};
  \\draw[thick, fill=red!8] (4,-2.0) rectangle (6.5,-1.5);
  \\node[font=\\footnotesize\\bfseries] at (5.25,-1.75) {9};
  % Row 4
  \\draw[thick, fill=blue!8] (1.5,-2.5) rectangle (4,-2.0);
  \\node[font=\\footnotesize\\bfseries] at (2.75,-2.25) {4};
  \\draw[thick, fill=red!8] (4,-2.5) rectangle (6.5,-2.0);
  \\node[font=\\footnotesize\\bfseries] at (5.25,-2.25) {12};
  % Table outer border
  \\draw[very thick] (1.5,-2.5) rectangle (6.5,-0.0);
  \\draw[very thick] (4,-2.5) -- (4,-0.0);
\\end{tikzpicture}`,
}
