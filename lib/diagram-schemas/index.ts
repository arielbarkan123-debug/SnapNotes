/**
 * Centralized diagram schema registry.
 *
 * Each schema tells the AI what JSON to produce for a given diagram type.
 * Split into subject-area files for maintainability.
 *
 * Usage: import { DIAGRAM_SCHEMAS, getDiagramSchemaPrompt } from '@/lib/diagram-schemas'
 */

export type { DiagramSchema } from './types'
import type { DiagramSchema } from './types'
import { mathSchemas } from './math'
import { geometrySchemas } from './geometry'
import { scienceSchemas } from './science'
import {
  getDiagramSchemaPrompt as _getDiagramSchemaPrompt,
  getFilteredDiagramSchemaPrompt as _getFilteredDiagramSchemaPrompt,
} from './helpers'

/**
 * All diagram schemas combined. 102 schemas across math, geometry, and physics.
 */
export const DIAGRAM_SCHEMAS: Record<string, DiagramSchema> = {
  ...mathSchemas,
  ...geometrySchemas,
  ...scienceSchemas,
}

/**
 * Generate a prompt listing diagram schemas, optionally filtered by subject.
 */
export function getDiagramSchemaPrompt(subject?: string): string {
  return _getDiagramSchemaPrompt(DIAGRAM_SCHEMAS, subject)
}

/**
 * Generate a context-aware diagram schema prompt filtered by subject and grade.
 */
export function getFilteredDiagramSchemaPrompt(subject?: string, grade?: number): string {
  return _getFilteredDiagramSchemaPrompt(DIAGRAM_SCHEMAS, subject, grade)
}
