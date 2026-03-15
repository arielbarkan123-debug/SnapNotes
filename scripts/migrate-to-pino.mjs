#!/usr/bin/env node
/**
 * Migrate console.* statements to structured pino logging in API routes.
 *
 * Usage: node scripts/migrate-to-pino.mjs
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const API_DIR = path.join(process.cwd(), 'app/api')

// Files to skip
const SKIP_FILES = new Set([
  'app/api/exams/route.ts',
])

// Namespace overrides by cleaned directory path
const NAMESPACE_MAP = {
  'formula-scanner/solve': 'api:formula-solve',
  'formula-scanner/analyze': 'api:formula-analyze',
  'srs/review': 'api:srs-review',
  'srs/due': 'api:srs-due',
  'srs/cards/generate-all': 'api:srs-generate-all',
  'prepare/chat': 'api:prepare-chat',
  'prepare/generate': 'api:prepare-generate',
  'prepare/pdf': 'api:prepare-pdf',
  'prepare/share': 'api:prepare-share',
  'tracking/recommendation': 'api:tracking-recommendation',
  'tracking/feature-affinity': 'api:tracking-feature-affinity',
  'tracking/explanation-engagement': 'api:tracking-explanation-engagement',
  'generate-course': 'api:generate-course',
  'generate-course/continue': 'api:generate-course-continue',
  'dashboard/intelligence': 'api:dashboard-intelligence',
  'courses/from-youtube': 'api:courses-from-youtube',
  'reports/weekly': 'api:reports-weekly',
  'reports/weekly/send-all': 'api:reports-send-all',
  'exam-prediction': 'api:exam-prediction',
  'cheatsheets': 'api:cheatsheets',
  'insights/mistakes': 'api:insights-mistakes',
  'practice/tutor': 'api:practice-tutor',
  'practice/diagram': 'api:practice-diagram',
  'practice/generate': 'api:practice-generate',
  'practice/log': 'api:practice-log',
  'diagram-engine/generate': 'api:diagram-generate',
  'evaluate-answer': 'api:evaluate-answer',
  'past-exams': 'api:past-exams',
  'process-document': 'api:process-document',
  'lesson-progress': 'api:lesson-progress',
  'upload-images': 'api:upload-images',
  'upload-document': 'api:upload-document',
  'concepts/extract': 'api:concepts-extract',
  'extraction/feedback': 'api:extraction-feedback',
  'performance/steps': 'api:performance-steps',
  'monitoring/errors': 'api:monitoring-errors',
  'self-assessment': 'api:self-assessment',
  'profile/refinement': 'api:profile-refinement',
  'courses/recent': 'api:courses-recent',
  'annotations': 'api:annotations',
  'deep-practice': 'api:deep-practice',
  'user/mastery': 'api:user-mastery',
  'user/gaps': 'api:user-gaps',
  'generate-all-covers': 'api:generate-all-covers',
  'generate-cover': 'api:generate-cover',
  'gamification/streak': 'api:gamification-streak',
  'auth/me': 'api:auth-me',
  'auth/forgot-password': 'api:auth-forgot-password',
  'progress': 'api:progress',
  'reflections': 'api:reflections',
  'metrics/engagement': 'api:metrics-engagement',
  'metrics/self-efficacy': 'api:metrics-self-efficacy',
  'chat': 'api:chat',
  'help': 'api:help',
  'recommendations': 'api:recommendations',
  'study-sessions': 'api:study-sessions',
  'weak-areas': 'api:weak-areas',
  'cron/aggregate-analytics': 'api:cron-aggregate',
  'analytics/session': 'api:analytics-session',
  'analytics/session/end': 'api:analytics-session-end',
  'analytics/events': 'api:analytics-events',
  'admin/analytics/clicks': 'api:admin-analytics-clicks',
  'admin/analytics/overview': 'api:admin-analytics-overview',
  'admin/analytics/events': 'api:admin-analytics-events',
  'admin/analytics/funnels': 'api:admin-analytics-funnels',
  'admin/analytics/export': 'api:admin-analytics-export',
  'admin/analytics/errors': 'api:admin-analytics-errors',
  'admin/analytics/journeys': 'api:admin-analytics-journeys',
  'admin/analytics/engagement': 'api:admin-analytics-engagement',
  'admin/analytics/sessions': 'api:admin-analytics-sessions',
  'admin/analytics/page-views': 'api:admin-analytics-page-views',
}

// Patterns for [param] routes -> namespace
const PARAM_NAMESPACE_MAP = {
  'exams/submit': 'api:exams-submit',
  'exams/': 'api:exams-id',
  'past-exams/analyze': 'api:past-exams-analyze',
  'past-exams/': 'api:past-exams-id',
  'homework/sessions/hint': 'api:homework-hint',
  'homework/sessions/': 'api:homework-session-id',
  'homework/check/practice-complete': 'api:practice-complete',
  'homework/check/': 'api:homework-check-id',
  'homework/walkthrough/step-chat': 'api:step-chat',
  'courses/mastery': 'api:courses-mastery',
  'courses/progress/complete-lesson': 'api:courses-complete-lesson',
  'courses/progress': 'api:courses-progress',
  'courses/': 'api:courses-id',
  'cheatsheets/': 'api:cheatsheets-id',
  'prepare/chat': 'api:prepare-chat',
  'prepare/pdf': 'api:prepare-pdf',
  'prepare/share': 'api:prepare-share',
}

function getNamespaceForFile(filePath) {
  const rel = path.relative(API_DIR, filePath)
  const dir = path.dirname(rel)
  const cleanDir = dir.replace(/\[.*?\]\/?/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '')

  // Try exact match
  if (NAMESPACE_MAP[cleanDir]) return NAMESPACE_MAP[cleanDir]

  // Try param namespace map
  for (const [pattern, ns] of Object.entries(PARAM_NAMESPACE_MAP)) {
    if (cleanDir === pattern || cleanDir === pattern.replace(/\/$/, '')) return ns
  }

  // Fallback: auto-generate
  const parts = cleanDir.split('/').filter(Boolean)
  return `api:${parts.join('-')}`
}

function hasLoggerImport(content) {
  return content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"')
}

function addLoggerImport(content, namespace) {
  if (hasLoggerImport(content)) return content

  const lines = content.split('\n')
  let lastImportEnd = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^import\s/) || line.match(/^\s*\}\s*from\s/)) {
      lastImportEnd = i
    }
  }

  if (lastImportEnd === -1) {
    return `import { createLogger } from '@/lib/logger'\n\nconst log = createLogger('${namespace}')\n\n${content}`
  }

  lines.splice(lastImportEnd + 1, 0,
    `import { createLogger } from '@/lib/logger'`,
    '',
    `const log = createLogger('${namespace}')`,
  )

  return lines.join('\n')
}

function replaceConsoleStatements(content) {
  let result = content

  // Handle multi-line console.error with template literal and second arg
  // console.error(`msg`, error) -> log.error({ err: error }, 'msg')
  result = result.replace(
    /console\.error\(\s*`\[.*?\]\s*([\s\S]*?)`\s*,\s*(\w+)\s*\)/g,
    (match, msg, errVar) => {
      const cleanMsg = msg.replace(/\$\{.*?\}/g, '').replace(/:\s*$/, '').replace(/\s+/g, ' ').trim()
      return `log.error({ err: ${errVar} }, '${cleanMsg}')`
    }
  )

  // console.error('[Tag] msg:', error) -> log.error({ err: error }, 'msg')
  result = result.replace(
    /console\.error\(\s*(['"])\[.*?\]\s*(.*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, msg, errVar) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.error({ err: ${errVar} }, '${cleanMsg}')`
    }
  )

  // console.error('msg:', error) without tag
  result = result.replace(
    /console\.error\(\s*(['"])((?!\[)[^'"]*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, msg, errVar) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.error({ err: ${errVar} }, '${cleanMsg}')`
    }
  )

  // console.error('[Tag] msg:', { obj }) -> log.error({ obj }, 'msg')
  result = result.replace(
    /console\.error\(\s*(['"])\[.*?\]\s*(.*?)\1\s*,\s*(\{[\s\S]*?\})\s*\)/g,
    (match, quote, msg, obj) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.error(${obj}, '${cleanMsg}')`
    }
  )

  // console.error('msg:', { obj }) without tag
  result = result.replace(
    /console\.error\(\s*(['"])((?!\[)[^'"]*?)\1\s*,\s*(\{[\s\S]*?\})\s*\)/g,
    (match, quote, msg, obj) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.error(${obj}, '${cleanMsg}')`
    }
  )

  // Template literal: console.error(`[Tag] msg ${var}`) -> log.error({ var }, 'msg')
  result = result.replace(
    /console\.error\(\s*`\[.*?\]\s*(.*?)`\s*\)/g,
    (match, msg) => {
      const vars = []
      const cleanMsg = msg.replace(/\$\{(.*?)\}/g, (m, expr) => {
        const vn = expr.trim()
        if (vn.match(/^[a-zA-Z_]\w*(\.\w+)*$/)) {
          vars.push(`${vn.split('.').pop()}: ${vn}`)
          return ''
        }
        return ''
      }).replace(/:\s*$/, '').replace(/\s+/g, ' ').trim()
      if (vars.length > 0) return `log.error({ ${vars.join(', ')} }, '${cleanMsg}')`
      return `log.error('${cleanMsg}')`
    }
  )

  // console.error('msg') no second arg, no tag
  result = result.replace(
    /console\.error\(\s*(['"])((?!\[)[^'"]*?)\1\s*\)/g,
    (match, quote, msg) => `log.error('${msg}')`
  )

  // console.warn('[Tag] msg:', data)
  result = result.replace(
    /console\.warn\(\s*(['"])\[.*?\]\s*(.*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, msg, dataVar) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.warn({ ${dataVar} }, '${cleanMsg}')`
    }
  )

  // console.warn('msg:', data) without tag
  result = result.replace(
    /console\.warn\(\s*(['"])((?!\[)[^'"]*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, msg, dataVar) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.warn({ ${dataVar} }, '${cleanMsg}')`
    }
  )

  // console.warn('msg') no second arg
  result = result.replace(
    /console\.warn\(\s*(['"])(.*?)\1\s*\)/g,
    (match, quote, msg) => {
      const cleanMsg = msg.replace(/^\[.*?\]\s*/, '').replace(/:\s*$/, '').trim()
      return `log.warn('${cleanMsg}')`
    }
  )

  // console.log('[Tag] msg:', data)
  result = result.replace(
    /console\.log\(\s*(['"])\[.*?\]\s*(.*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, msg, dataVar) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.debug({ ${dataVar} }, '${cleanMsg}')`
    }
  )

  // console.log('[Tag] msg:', { obj })
  result = result.replace(
    /console\.log\(\s*(['"])\[.*?\]\s*(.*?)\1\s*,\s*(\{[\s\S]*?\})\s*\)/g,
    (match, quote, msg, obj) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.debug(${obj}, '${cleanMsg}')`
    }
  )

  // console.log('msg:', data) without tag
  result = result.replace(
    /console\.log\(\s*(['"])((?!\[)[^'"]*?)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, msg, dataVar) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.debug({ ${dataVar} }, '${cleanMsg}')`
    }
  )

  // Template literal: console.log(`[Tag] msg ${var}`) -> log.debug({ var }, 'msg')
  result = result.replace(
    /console\.log\(\s*`\[.*?\]\s*(.*?)`\s*\)/g,
    (match, msg) => {
      const vars = []
      const cleanMsg = msg.replace(/\$\{(.*?)\}/g, (m, expr) => {
        const vn = expr.trim()
        if (vn.match(/^[a-zA-Z_]\w*(\.\w+)*$/)) {
          vars.push(`${vn.split('.').pop()}: ${vn}`)
          return ''
        }
        return ''
      }).replace(/:\s*$/, '').replace(/\s+/g, ' ').trim()
      if (vars.length > 0) return `log.debug({ ${vars.join(', ')} }, '${cleanMsg}')`
      return `log.debug('${cleanMsg}')`
    }
  )

  // Template literal: console.log(`msg ${var}`) without tag
  result = result.replace(
    /console\.log\(\s*`((?!\[)[\s\S]*?)`\s*\)/g,
    (match, msg) => {
      const vars = []
      const cleanMsg = msg.replace(/\$\{(.*?)\}/g, (m, expr) => {
        const vn = expr.trim()
        if (vn.match(/^[a-zA-Z_]\w*(\.\w+)*$/)) {
          vars.push(`${vn.split('.').pop()}: ${vn}`)
          return ''
        }
        return ''
      }).replace(/:\s*$/, '').replace(/\s+/g, ' ').trim()
      if (vars.length > 0) return `log.debug({ ${vars.join(', ')} }, '${cleanMsg}')`
      return `log.debug('${cleanMsg}')`
    }
  )

  // console.log('msg') no second arg, no tag, no template
  result = result.replace(
    /console\.log\(\s*(['"])((?!\[)[^'"]*?)\1\s*\)/g,
    (match, quote, msg) => `log.debug('${msg}')`
  )

  // console.log('[Tag] msg') no second arg
  result = result.replace(
    /console\.log\(\s*(['"])\[(.*?)\]\s*(.*?)\1\s*\)/g,
    (match, quote, tag, msg) => {
      const cleanMsg = msg.replace(/:\s*$/, '').trim()
      return `log.debug('${cleanMsg || tag}')`
    }
  )

  return result
}

async function main() {
  const files = await glob('app/api/**/route.ts', { cwd: process.cwd() })
  const routeFiles = files
    .map(f => path.join(process.cwd(), f))
    .filter(f => {
      const rel = path.relative(process.cwd(), f)
      if (SKIP_FILES.has(rel)) return false
      const content = fs.readFileSync(f, 'utf-8')
      return content.includes('console.')
    })

  console.log(`Found ${routeFiles.length} files with console.* statements`)

  let migrated = 0
  let skipped = 0

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const namespace = getNamespaceForFile(file)

    let updated = addLoggerImport(content, namespace)
    updated = replaceConsoleStatements(updated)

    if (updated !== content) {
      fs.writeFileSync(file, updated, 'utf-8')
      const rel = path.relative(process.cwd(), file)
      console.log(`  [MIGRATED] ${rel} -> ${namespace}`)
      migrated++
    } else {
      const rel = path.relative(process.cwd(), file)
      console.log(`  [SKIP] ${rel}`)
      skipped++
    }
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped`)
}

main().catch(console.error)
