/**
 * Records misconceptions detected during homework tutoring sessions
 * back into the intelligence system (mistake_patterns table).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('homework:misconception-recorder')

interface MisconceptionRecord {
  userId: string
  misconceptionType: string
  detectedSubject: string | null
  detectedTopic: string | null
  sessionId: string
}

export async function recordHomeworkMisconception(
  supabase: SupabaseClient,
  record: MisconceptionRecord
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('mistake_patterns')
      .select('id, patterns')
      .eq('user_id', record.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const patternName = record.misconceptionType
    const now = new Date().toISOString()

    if (existing && existing.patterns && Array.isArray(existing.patterns)) {
      const patterns = [...existing.patterns]
      const existingPattern = patterns.find(
        (p: { patternName?: string }) => p.patternName === patternName
      )

      if (existingPattern) {
        existingPattern.frequency = (existingPattern.frequency || 0) + 1
        existingPattern.lastSeen = now
        existingPattern.sources = [...(existingPattern.sources || []), 'homework'].slice(-10)
      } else {
        patterns.push({
          patternName,
          frequency: 1,
          lastSeen: now,
          subject: record.detectedSubject,
          topic: record.detectedTopic,
          sources: ['homework'],
        })
      }

      await supabase
        .from('mistake_patterns')
        .update({
          patterns,
          stale_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', record.userId)
    } else {
      await supabase
        .from('mistake_patterns')
        .insert({
          user_id: record.userId,
          patterns: [{
            patternName,
            frequency: 1,
            lastSeen: now,
            subject: record.detectedSubject,
            topic: record.detectedTopic,
            sources: ['homework'],
          }],
          insufficient_data: true,
          stale_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
    }
  } catch (err) {
    log.error({ err }, 'Failed to record misconception')
  }
}
