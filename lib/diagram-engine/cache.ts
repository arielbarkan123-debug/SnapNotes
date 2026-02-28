/**
 * Two-tier diagram cache to avoid regenerating the same diagram.
 *
 * Tier 1: In-memory LRU cache (Node.js process, fast, ephemeral)
 * Tier 2: Supabase table (persistent, cross-session, cross-user)
 *
 * Only diagrams that passed QA are cached (qaVerdict === 'pass').
 * Cache key is a SHA-256 hash of the normalized question text.
 */

import { createHash } from 'crypto';
import type { Pipeline } from './router';
import type { DiagramResult } from './index';

// ─── Tier 1: In-Memory LRU Cache ───────────────────────────────────────────

const MAX_MEMORY_ENTRIES = 50;
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  result: DiagramResult;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (now - entry.timestamp > MEMORY_TTL_MS) {
      memoryCache.delete(key);
    }
  }
}

function evictLRU(): void {
  if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;
  // Map iteration order is insertion order — delete oldest entries
  const toDelete = memoryCache.size - MAX_MEMORY_ENTRIES;
  let deleted = 0;
  for (const key of memoryCache.keys()) {
    if (deleted >= toDelete) break;
    memoryCache.delete(key);
    deleted++;
  }
}

// ─── Question Normalization ─────────────────────────────────────────────────

/**
 * Normalize a question for cache key generation.
 * Strips common prefixes, lowercases, trims whitespace.
 */
function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    // Remove common prompt prefixes
    .replace(/^(diagram of|draw a|show me|generate a|create a|make a|plot a|graph a|sketch a)\s+/i, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a cache key from a question and optional pipeline.
 */
function getCacheKey(question: string, pipeline?: Pipeline): string {
  const normalized = normalizeQuestion(question);
  const input = pipeline ? `${normalized}::${pipeline}` : normalized;
  return createHash('sha256').update(input).digest('hex');
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Look up a cached diagram for a question.
 * Checks memory first, then Supabase.
 * Returns null on cache miss.
 */
export async function getCachedDiagram(
  question: string,
  pipeline?: Pipeline,
): Promise<DiagramResult | null> {
  const key = getCacheKey(question, pipeline);

  // Tier 1: Memory cache
  evictExpired();
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    // Move to end (refresh LRU position)
    memoryCache.delete(key);
    memoryCache.set(key, { ...memEntry, timestamp: Date.now() });
    console.log(`[DiagramCache] Memory HIT for key ${key.slice(0, 12)}...`);
    return memEntry.result;
  }

  // Tier 2: Supabase
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('diagram_cache')
      .select('image_data, pipeline, qa_verdict, hit_count')
      .eq('question_hash', key)
      .single();

    if (error || !data) return null;

    // Reconstruct DiagramResult
    const result: DiagramResult = {
      imageUrl: data.image_data,
      pipeline: data.pipeline as Pipeline,
      attempts: 0,
      qaVerdict: 'cached',
    };

    // Populate memory cache for faster future lookups
    memoryCache.set(key, { result, timestamp: Date.now() });
    evictLRU();

    // Bump hit count (fire-and-forget)
    const currentHitCount = typeof (data as Record<string, unknown>).hit_count === 'number'
      ? (data as Record<string, unknown>).hit_count as number
      : 0;
    void supabase
      .from('diagram_cache')
      .update({ hit_count: currentHitCount + 1, last_hit_at: new Date().toISOString() })
      .eq('question_hash', key)
      .then(() => {});

    console.log(`[DiagramCache] Supabase HIT for key ${key.slice(0, 12)}...`);
    return result;
  } catch {
    // Supabase unavailable — not fatal
    return null;
  }
}

/**
 * Cache a successfully generated diagram.
 * Stores in both memory and Supabase (fire-and-forget for Supabase).
 * Only caches diagrams that passed QA.
 */
export async function cacheDiagram(
  question: string,
  result: DiagramResult,
): Promise<void> {
  // Only cache diagrams that passed QA
  if (result.qaVerdict !== 'pass' && result.qaVerdict !== 'pass-after-retry') {
    return;
  }

  const key = getCacheKey(question, result.pipeline);

  // Tier 1: Memory cache (always)
  memoryCache.set(key, { result, timestamp: Date.now() });
  evictLRU();

  // Tier 2: Supabase (fire-and-forget)
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    await supabase.from('diagram_cache').upsert({
      question_hash: key,
      question_text: question.slice(0, 500),
      pipeline: result.pipeline,
      image_data: result.imageUrl,
      qa_verdict: result.qaVerdict,
      hit_count: 0,
    }, { onConflict: 'question_hash' });
  } catch {
    // Supabase unavailable — not fatal, memory cache is still warm
  }
}
