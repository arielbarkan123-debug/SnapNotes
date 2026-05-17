// Colorized AI cost logger — server-side only, no external dependencies.
// Mirror of LLM_PRICE must stay in sync with lib/ai/claude.ts.

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  purple:  '\x1b[95m',
} as const

// Keep in sync with LLM_PRICE in lib/ai/claude.ts
const LLM_PRICE = {
  input:       3.00,
  output:     15.00,
  cache_read:  0.30,
  cache_write: 3.75,
} as const

export type AIAction =
  | 'course-generation'
  | 'homework-check-smart'
  | 'prepare-guide'
  | 'homework-check'
  | 'practice-session'
  | 'diagram'
  | 'exam-generation'
  | 'lesson-expansion'
  | 'chat-prepare'
  | 'walkthrough'
  | 'chat-course'
  | 'flashcard-batch'

export interface LLMUsageInput {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}

type LogContext = Record<string, unknown>

const ACTION_LABEL: Record<AIAction, string> = {
  'course-generation':    'Course Generation',
  'homework-check-smart': 'Homework Check (Smart)',
  'prepare-guide':        'Prepare Guide',
  'homework-check':       'Homework Check',
  'practice-session':     'Practice Session',
  'diagram':              'Diagram',
  'exam-generation':      'Exam Generation',
  'lesson-expansion':     'Lesson Expansion',
  'chat-prepare':         'Chat (Prepare Guide)',
  'walkthrough':          'Walkthrough',
  'chat-course':          'Chat (Course)',
  'flashcard-batch':      'Flashcard Batch',
}

const LEVEL_ORDER = { debug: 0, info: 1, warn: 2, error: 3 } as const
type LevelName = keyof typeof LEVEL_ORDER

function resolveLevel(): LevelName {
  const env = process.env.AI_LOG_LEVEL?.toLowerCase()
  if (env && env in LEVEL_ORDER) return env as LevelName
  return 'info'
}

class Logger {
  private timers = new Map<string, number>()

  private ts(): string {
    const d = new Date()
    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    const ss = d.getSeconds().toString().padStart(2, '0')
    const ms = d.getMilliseconds().toString().padStart(3, '0')
    return `${hh}:${mm}:${ss}.${ms}`
  }

  private emit(line: string): void {
    process.stdout.write(line + '\n')
  }

  private emitBlock(lines: string[]): void {
    process.stdout.write(lines.join('\n') + '\n')
  }

  private prefix(color: string, badge: string): string {
    return `${C.dim}[${this.ts()}]${C.reset} ${color}${badge}${C.reset}`
  }

  private ctx(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return ''
    return ` ${C.dim}${JSON.stringify(context)}${C.reset}`
  }

  private allowed(level: LevelName): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[resolveLevel()]
  }

  startTimer(label: string): void {
    this.timers.set(label, Date.now())
  }

  endTimer(label: string): number {
    const start = this.timers.get(label)
    this.timers.delete(label)
    if (start == null) return 0
    return Date.now() - start
  }

  debug(message: string, context?: LogContext): void {
    if (!this.allowed('debug')) return
    this.emit(`${this.prefix(C.magenta, '🐛 DEBUG')}  ${message}${this.ctx(context)}`)
  }

  info(message: string, context?: LogContext): void {
    if (!this.allowed('info')) return
    this.emit(`${this.prefix(C.blue, 'ℹ INFO ')}  ${message}${this.ctx(context)}`)
  }

  warn(message: string, context?: LogContext): void {
    if (!this.allowed('warn')) return
    this.emit(`${this.prefix(C.yellow, '⚠ WARN ')}  ${message}${this.ctx(context)}`)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errCtx: LogContext = { ...context }
    if (error instanceof Error) {
      errCtx.errorMessage = error.message
      errCtx.errorStack   = error.stack
    } else if (error != null) {
      errCtx.error = String(error)
    }
    this.emit(`${this.prefix(C.red, '✖ ERROR')}  ${message}${this.ctx(errCtx)}`)
  }

  aiAction(action: AIAction, phase: 'start' | 'step' | 'complete', context?: LogContext): void {
    if (!this.allowed('info')) return
    const label = ACTION_LABEL[action]
    const symbol =
      phase === 'start'    ? `${C.blue}→${C.reset}` :
      phase === 'complete' ? `${C.green}✅${C.reset}` :
                             `${C.dim}·${C.reset}`
    this.emit(`${this.prefix(C.blue, 'ℹ INFO ')}  ${symbol} ${label}${this.ctx(context)}`)
  }

  cacheHit(action: AIAction): void {
    if (!this.allowed('info')) return
    this.emit(`${this.prefix(C.purple, '⚡ CACHE')}  hit   ${C.green}${ACTION_LABEL[action]}${C.reset}`)
  }

  cacheMiss(action: AIAction): void {
    if (!this.allowed('info')) return
    this.emit(`${this.prefix(C.purple, '⚡ CACHE')}  miss  ${C.yellow}${ACTION_LABEL[action]}${C.reset}`)
  }

  llmUsage(
    action: AIAction,
    usage: LLMUsageInput,
    context?: { model?: string; durationMs?: number; fn?: string; [key: string]: unknown },
  ): void {
    const cacheRead  = usage.cache_read_input_tokens  ?? 0
    const cacheWrite = usage.cache_creation_input_tokens ?? 0
    const billable   = usage.input_tokens - cacheRead
    const total      = usage.input_tokens + usage.output_tokens

    const cost = +(
      (billable              / 1_000_000) * LLM_PRICE.input +
      (usage.output_tokens   / 1_000_000) * LLM_PRICE.output +
      (cacheRead             / 1_000_000) * LLM_PRICE.cache_read +
      (cacheWrite            / 1_000_000) * LLM_PRICE.cache_write
    ).toFixed(6)

    const model = context?.model ?? 'unknown'

    // Check if a timer was running for this action label
    let durationMs = context?.durationMs as number | undefined
    if (durationMs == null) {
      const timerStart = this.timers.get(action)
      if (timerStart != null) {
        durationMs = this.endTimer(action)
      }
    }

    const n = (num: number, decimals = 0) =>
      num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

    const label = ACTION_LABEL[action]
    const ts    = this.ts()
    const dim   = C.dim
    const rst   = C.reset
    const cy    = C.cyan
    const bld   = C.bold

    const W = 47
    const bar  = `${dim}${'─'.repeat(W)}${rst}`
    const top  = `${dim}┌${'─'.repeat(W - 2)}┐${rst}`
    const mid  = `${dim}├${'─'.repeat(W - 2)}┤${rst}`
    const bot  = `${dim}└${'─'.repeat(W - 2)}┘${rst}`

    const row = (label: string, value: string) => {
      const inner = `  ${label.padEnd(22)}${value.padStart(W - 26)}`
      return `${dim}[${ts}]${rst}     ${dim}│${rst}${cy}${inner}${rst}  ${dim}│${rst}`
    }

    const lines = [
      `${dim}[${ts}]${rst} ${bar}`,
      `${dim}[${ts}]${rst} ${cy}${bld}💰  LLM USAGE — ${label}${rst}`,
      `${dim}[${ts}]${rst}     ${cy}Model${rst}     ${model}`,
      `${dim}[${ts}]${rst}     ${top}`,
      row('Input tokens',  n(usage.input_tokens)),
      row('Output tokens', n(usage.output_tokens)),
      row('Cache read',    n(cacheRead)),
      row('Cache write',   n(cacheWrite)),
      row('Total tokens',  n(total)),
      `${dim}[${ts}]${rst}     ${mid}`,
      row('Est. cost USD', `$${cost.toFixed(6)}`),
      ...(durationMs != null ? [row('Duration', `${n(durationMs)} ms`)] : []),
      `${dim}[${ts}]${rst}     ${bot}`,
      `${dim}[${ts}]${rst} ${bar}`,
    ]
    this.emitBlock(lines)
  }
}

export const aiLogger = new Logger()
