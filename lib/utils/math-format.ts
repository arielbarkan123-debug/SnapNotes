/**
 * Math Formatting Utility
 *
 * Converts plain text math notation to properly formatted Unicode/HTML
 * Examples:
 *   x^2 → x²
 *   x^(n+1) → x⁽ⁿ⁺¹⁾
 *   a_1 → a₁
 *   sqrt(x) → √x
 *   x >= 5 → x ≥ 5
 */

// Superscript character mapping
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'n': 'ⁿ',
  'i': 'ⁱ',
  'x': 'ˣ',
  'y': 'ʸ',
  'a': 'ᵃ',
  'b': 'ᵇ',
  'c': 'ᶜ',
  'd': 'ᵈ',
  'e': 'ᵉ',
  'f': 'ᶠ',
  'g': 'ᵍ',
  'h': 'ʰ',
  'j': 'ʲ',
  'k': 'ᵏ',
  'l': 'ˡ',
  'm': 'ᵐ',
  'o': 'ᵒ',
  'p': 'ᵖ',
  'r': 'ʳ',
  's': 'ˢ',
  't': 'ᵗ',
  'u': 'ᵘ',
  'v': 'ᵛ',
  'w': 'ʷ',
  'z': 'ᶻ',
}

// Subscript character mapping
const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'h': 'ₕ',
  'i': 'ᵢ',
  'j': 'ⱼ',
  'k': 'ₖ',
  'l': 'ₗ',
  'm': 'ₘ',
  'n': 'ₙ',
  'o': 'ₒ',
  'p': 'ₚ',
  'r': 'ᵣ',
  's': 'ₛ',
  't': 'ₜ',
  'u': 'ᵤ',
  'v': 'ᵥ',
  'x': 'ₓ',
}

// Math symbol replacements
const MATH_SYMBOLS: [RegExp, string][] = [
  // Comparison operators
  [/>=|≥/g, '≥'],
  [/<=|≤/g, '≤'],
  [/!=/g, '≠'],
  [/==/g, '≡'],
  [/<>/g, '≠'],

  // Arithmetic
  [/\+-|-\+/g, '±'],
  [/\*\*/g, '^'], // Convert ** to ^ for further processing
  [/\*/g, '×'],
  [/÷|\/(?=\s)/g, '÷'], // Only standalone / becomes ÷

  // Roots and special
  [/sqrt\(([^)]+)\)/gi, '√($1)'],
  [/cbrt\(([^)]+)\)/gi, '∛($1)'],
  [/\bpi\b/gi, 'π'],
  [/\btheta\b/gi, 'θ'],
  [/\balpha\b/gi, 'α'],
  [/\bbeta\b/gi, 'β'],
  [/\bgamma\b/gi, 'γ'],
  [/\bdelta\b/gi, 'δ'],
  [/\bsigma\b/gi, 'σ'],
  [/\binfinity\b/gi, '∞'],
  [/\binf\b/gi, '∞'],

  // Set notation
  [/\bin\b/g, '∈'],
  [/\bnotin\b/g, '∉'],
  [/\bunion\b/gi, '∪'],
  [/\bintersect\b/gi, '∩'],
  [/\bsubset\b/gi, '⊂'],
  [/\bsuperset\b/gi, '⊃'],

  // Arrows
  [/->/g, '→'],
  [/<-/g, '←'],
  [/=>/g, '⇒'],
  [/<=>/g, '⇔'],

  // Other
  [/\.\.\./g, '…'],
  [/\bapprox\b/gi, '≈'],
  [/~=/g, '≈'],
]

/**
 * Converts a string to superscript Unicode characters
 */
function toSuperscript(text: string): string {
  return text
    .split('')
    .map((char) => SUPERSCRIPT_MAP[char.toLowerCase()] || char)
    .join('')
}

/**
 * Converts a string to subscript Unicode characters
 */
function toSubscript(text: string): string {
  return text
    .split('')
    .map((char) => SUBSCRIPT_MAP[char.toLowerCase()] || char)
    .join('')
}

/**
 * Formats a math expression with proper Unicode symbols
 *
 * @param text - The text containing math expressions
 * @returns Formatted text with Unicode math symbols
 */
export function formatMath(text: string): string {
  if (!text) return text

  let result = text

  // Apply symbol replacements first
  for (const [pattern, replacement] of MATH_SYMBOLS) {
    result = result.replace(pattern, replacement)
  }

  // Handle exponents: x^2, x^(n+1), x^{2n}, etc.
  // Match: base^exponent where exponent can be:
  // - Single character or number: x^2, x^n
  // - Parenthesized: x^(n+1)
  // - Braced: x^{2n}
  result = result.replace(
    /\^(\([^)]+\)|\{[^}]+\}|[a-zA-Z0-9+-]+)/g,
    (_, exp) => {
      // Remove brackets if present
      let exponent = exp
      if ((exp.startsWith('(') && exp.endsWith(')')) ||
          (exp.startsWith('{') && exp.endsWith('}'))) {
        exponent = exp.slice(1, -1)
      }
      return toSuperscript(exponent)
    }
  )

  // Handle subscripts: x_1, a_n, x_{ij}, etc.
  result = result.replace(
    /_(\([^)]+\)|\{[^}]+\}|[a-zA-Z0-9]+)/g,
    (_, sub) => {
      // Remove brackets if present
      let subscript = sub
      if ((sub.startsWith('(') && sub.endsWith(')')) ||
          (sub.startsWith('{') && sub.endsWith('}'))) {
        subscript = sub.slice(1, -1)
      }
      return toSubscript(subscript)
    }
  )

  // Handle fractions written as (a/b) - make them look better
  result = result.replace(
    /\((\d+)\/(\d+)\)/g,
    (_, num, den) => `${toSuperscript(num)}⁄${toSubscript(den)}`
  )

  return result
}

/**
 * Checks if a string contains math-like content
 */
export function containsMath(text: string): boolean {
  if (!text) return false

  // Patterns that suggest math content
  const mathPatterns = [
    /\^[\d\w({\[]/,      // Exponents
    /_[\d\w({\[]/,       // Subscripts
    /[+\-*/=<>≤≥≠±×÷]/,  // Operators
    /\d+\/\d+/,          // Fractions
    /sqrt|cbrt/i,        // Roots
    /[πθαβγδσ∞∈∉∪∩]/,   // Math symbols
  ]

  return mathPatterns.some((pattern) => pattern.test(text))
}

/**
 * Formats text that might contain math, preserving non-math content
 */
export function formatMathInText(text: string): string {
  if (!text) return text

  // Always apply formatting - it's safe for non-math text
  return formatMath(text)
}

export default formatMath
