/**
 * Schema definition for a diagram type.
 * Each schema tells the AI what JSON to produce for a given diagram type.
 */
export interface DiagramSchema {
  type: string
  subject: string
  gradeRange: string
  description: string
  jsonExample: string
  /** Preferred client-side rendering engine for this diagram type */
  engine?: 'desmos' | 'geogebra' | 'recharts' | 'mermaid' | 'svg' | 'tikz' | 'recraft'
}
