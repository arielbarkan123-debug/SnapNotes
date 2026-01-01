/**
 * Prerequisite Graph
 *
 * A directed graph data structure for modeling concept prerequisite relationships.
 * Supports traversal, gap detection, and optimal learning path generation.
 */

import { createClient } from '@/lib/supabase/server'
import type { Concept, ConceptNode, LearningPath, DependencyStrength } from './types'

// =============================================================================
// Prerequisite Graph Class
// =============================================================================

export class PrerequisiteGraph {
  // concept_id -> set of prerequisite_ids
  private prerequisites: Map<string, Set<string>> = new Map()
  // concept_id -> set of dependent_ids (reverse edges)
  private dependents: Map<string, Set<string>> = new Map()
  // concept_id -> concept data
  private concepts: Map<string, Concept> = new Map()
  // concept_id -> prerequisite_id -> strength
  private strengths: Map<string, Map<string, DependencyStrength>> = new Map()

  // ==========================================================================
  // Loading
  // ==========================================================================

  /**
   * Load the graph from the database
   */
  async loadFromDatabase(options?: { subject?: string; topic?: string }): Promise<void> {
    const supabase = await createClient()

    // Build query for concepts
    let conceptQuery = supabase.from('concepts').select('*')
    if (options?.subject) {
      conceptQuery = conceptQuery.eq('subject', options.subject)
    }
    if (options?.topic) {
      conceptQuery = conceptQuery.eq('topic', options.topic)
    }

    const { data: conceptsData, error: conceptsError } = await conceptQuery

    if (conceptsError) {
      throw new Error(`Failed to load concepts: ${conceptsError.message}`)
    }

    // Store concepts
    for (const concept of conceptsData || []) {
      this.concepts.set(concept.id, concept)
      this.prerequisites.set(concept.id, new Set())
      this.dependents.set(concept.id, new Set())
      this.strengths.set(concept.id, new Map())
    }

    // Get concept IDs for filtering prerequisites
    const conceptIds = Array.from(this.concepts.keys())
    if (conceptIds.length === 0) return

    // Load prerequisites
    const { data: prereqsData, error: prereqsError } = await supabase
      .from('concept_prerequisites')
      .select('concept_id, prerequisite_id, dependency_strength')
      .in('concept_id', conceptIds)

    if (prereqsError) {
      throw new Error(`Failed to load prerequisites: ${prereqsError.message}`)
    }

    // Build adjacency lists
    for (const row of prereqsData || []) {
      // Add prerequisite edge
      const prereqSet = this.prerequisites.get(row.concept_id)
      if (prereqSet) {
        prereqSet.add(row.prerequisite_id)
      }

      // Add dependent edge (reverse)
      const depSet = this.dependents.get(row.prerequisite_id)
      if (depSet) {
        depSet.add(row.concept_id)
      }

      // Store strength
      const strengthMap = this.strengths.get(row.concept_id)
      if (strengthMap) {
        strengthMap.set(row.prerequisite_id, row.dependency_strength as DependencyStrength)
      }
    }
  }

  /**
   * Load graph for specific concept IDs
   * @param conceptIds Concept IDs to load
   * @param maxDepth Maximum recursion depth to prevent infinite loops (default: 20)
   * @param currentDepth Current recursion depth (internal use)
   */
  async loadForConcepts(conceptIds: string[], maxDepth = 20, currentDepth = 0): Promise<void> {
    if (conceptIds.length === 0) return

    // Prevent infinite recursion due to cycles in prerequisite graph
    if (currentDepth >= maxDepth) {
      console.warn(`[PrerequisiteGraph] Max recursion depth (${maxDepth}) reached, stopping prerequisite loading`)
      return
    }

    const supabase = await createClient()

    // Get concepts
    const { data: conceptsData } = await supabase
      .from('concepts')
      .select('*')
      .in('id', conceptIds)

    for (const concept of conceptsData || []) {
      this.concepts.set(concept.id, concept)
      this.prerequisites.set(concept.id, new Set())
      this.dependents.set(concept.id, new Set())
      this.strengths.set(concept.id, new Map())
    }

    // Get prerequisites for these concepts
    const { data: prereqsData } = await supabase
      .from('concept_prerequisites')
      .select('concept_id, prerequisite_id, dependency_strength')
      .in('concept_id', conceptIds)

    for (const row of prereqsData || []) {
      const prereqSet = this.prerequisites.get(row.concept_id)
      if (prereqSet) {
        prereqSet.add(row.prerequisite_id)
      }
      const strengthMap = this.strengths.get(row.concept_id)
      if (strengthMap) {
        strengthMap.set(row.prerequisite_id, row.dependency_strength as DependencyStrength)
      }
    }

    // Recursively load prerequisites that aren't in our set
    const missingPrereqs = new Set<string>()
    for (const prereqSet of this.prerequisites.values()) {
      for (const prereqId of prereqSet) {
        if (!this.concepts.has(prereqId)) {
          missingPrereqs.add(prereqId)
        }
      }
    }

    if (missingPrereqs.size > 0) {
      await this.loadForConcepts(Array.from(missingPrereqs), maxDepth, currentDepth + 1)
    }
  }

  // ==========================================================================
  // Graph Queries
  // ==========================================================================

  /**
   * Get direct prerequisites for a concept
   */
  getDirectPrerequisites(conceptId: string): string[] {
    return Array.from(this.prerequisites.get(conceptId) || [])
  }

  /**
   * Get all prerequisites (transitive closure) for a concept
   * @param maxDepth Maximum depth to traverse (default: 10)
   */
  getAllPrerequisites(conceptId: string, maxDepth = 10): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const queue: { id: string; depth: number }[] = [{ id: conceptId, depth: 0 }]

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!

      if (visited.has(id) || depth > maxDepth) continue
      visited.add(id)

      const prereqs = this.prerequisites.get(id) || new Set()
      for (const prereqId of prereqs) {
        if (!visited.has(prereqId)) {
          result.push(prereqId)
          queue.push({ id: prereqId, depth: depth + 1 })
        }
      }
    }

    return result
  }

  /**
   * Get all concepts that depend on a given concept (what it unlocks)
   */
  getDependents(conceptId: string, maxDepth = 10): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const queue: { id: string; depth: number }[] = [{ id: conceptId, depth: 0 }]

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!

      if (visited.has(id) || depth > maxDepth) continue
      visited.add(id)

      const deps = this.dependents.get(id) || new Set()
      for (const depId of deps) {
        if (!visited.has(depId)) {
          result.push(depId)
          queue.push({ id: depId, depth: depth + 1 })
        }
      }
    }

    return result
  }

  /**
   * Get concept data by ID
   */
  getConcept(conceptId: string): Concept | undefined {
    return this.concepts.get(conceptId)
  }

  /**
   * Get all concepts in the graph
   */
  getAllConcepts(): Concept[] {
    return Array.from(this.concepts.values())
  }

  /**
   * Get dependency strength between two concepts
   */
  getDependencyStrength(conceptId: string, prerequisiteId: string): DependencyStrength | undefined {
    return this.strengths.get(conceptId)?.get(prerequisiteId)
  }

  // ==========================================================================
  // Gap Detection
  // ==========================================================================

  /**
   * Find concepts the user is missing in the path to target concept(s)
   * @param targetConceptIds Concepts the user wants to learn
   * @param userMastery Map of concept_id -> mastery_level (0-1)
   * @param threshold Minimum mastery to consider "known" (default: 0.5)
   */
  findGapsToTargets(
    targetConceptIds: string[],
    userMastery: Map<string, number>,
    threshold = 0.5
  ): string[] {
    const gaps = new Set<string>()

    for (const targetId of targetConceptIds) {
      const allPrereqs = this.getAllPrerequisites(targetId)

      for (const prereqId of allPrereqs) {
        const mastery = userMastery.get(prereqId) ?? 0
        if (mastery < threshold) {
          gaps.add(prereqId)
        }
      }
    }

    return Array.from(gaps)
  }

  /**
   * Check if a concept is ready to learn (all essential prerequisites met)
   */
  isReadyToLearn(
    conceptId: string,
    userMastery: Map<string, number>,
    threshold = 0.5
  ): { ready: boolean; missingPrereqs: string[] } {
    const directPrereqs = this.getDirectPrerequisites(conceptId)
    const missingPrereqs: string[] = []

    for (const prereqId of directPrereqs) {
      const strength = this.getDependencyStrength(conceptId, prereqId)
      const mastery = userMastery.get(prereqId) ?? 0

      // Only check essential (3) and important (2) prerequisites
      if (strength && strength >= 2 && mastery < threshold) {
        missingPrereqs.push(prereqId)
      }
    }

    return {
      ready: missingPrereqs.length === 0,
      missingPrereqs,
    }
  }

  // ==========================================================================
  // Learning Path Generation
  // ==========================================================================

  /**
   * Generate an optimal learning path to target concepts
   * Uses topological sort with priority based on:
   * 1. User's current mastery (strengthen weak first)
   * 2. Number of dependents (foundational concepts first)
   * 3. Difficulty level (easier first)
   */
  getOptimalLearningPath(
    targetConceptIds: string[],
    userMastery: Map<string, number>,
    threshold = 0.5
  ): LearningPath {
    // Collect all concepts needed (targets + their prerequisites)
    const allNeeded = new Set<string>(targetConceptIds)
    for (const targetId of targetConceptIds) {
      const prereqs = this.getAllPrerequisites(targetId)
      prereqs.forEach((p) => allNeeded.add(p))
    }

    // Filter to concepts user hasn't mastered
    const toLearn = Array.from(allNeeded).filter((id) => {
      const mastery = userMastery.get(id) ?? 0
      return mastery < threshold
    })

    // Build subgraph for topological sort
    const inDegree = new Map<string, number>()
    const filteredPrereqs = new Map<string, Set<string>>()

    for (const id of toLearn) {
      inDegree.set(id, 0)
      filteredPrereqs.set(id, new Set())
    }

    for (const id of toLearn) {
      const prereqs = this.prerequisites.get(id) || new Set()
      for (const prereqId of prereqs) {
        if (toLearn.includes(prereqId)) {
          filteredPrereqs.get(id)?.add(prereqId)
          inDegree.set(prereqId, (inDegree.get(prereqId) || 0) + 1)
        }
      }
    }

    // Kahn's algorithm with priority queue
    const result: string[] = []
    const available = toLearn.filter((id) => {
      // Available if no prerequisites in the to-learn set
      const prereqsInSet = Array.from(filteredPrereqs.get(id) || [])
      return prereqsInSet.length === 0
    })

    while (available.length > 0) {
      // Sort by priority: low mastery first, then high dependents, then low difficulty
      available.sort((a, b) => {
        const masteryA = userMastery.get(a) ?? 0
        const masteryB = userMastery.get(b) ?? 0
        if (masteryA !== masteryB) return masteryA - masteryB

        const depsA = this.dependents.get(a)?.size || 0
        const depsB = this.dependents.get(b)?.size || 0
        if (depsA !== depsB) return depsB - depsA // More dependents first

        const diffA = this.concepts.get(a)?.difficulty_level || 3
        const diffB = this.concepts.get(b)?.difficulty_level || 3
        return diffA - diffB // Lower difficulty first
      })

      const next = available.shift()!
      result.push(next)

      // Update degrees for concepts that had this as a prerequisite
      for (const id of toLearn) {
        if (filteredPrereqs.get(id)?.has(next)) {
          filteredPrereqs.get(id)?.delete(next)
          if (filteredPrereqs.get(id)?.size === 0 && !result.includes(id) && !available.includes(id)) {
            available.push(id)
          }
        }
      }
    }

    // Estimate time (rough: 5-15 min per concept based on difficulty)
    const estimatedTime = result.reduce((sum, id) => {
      const difficulty = this.concepts.get(id)?.difficulty_level || 3
      return sum + 5 + difficulty * 2 // 7-15 minutes
    }, 0)

    return {
      concepts: result,
      totalConcepts: result.length,
      estimatedTime,
      gapsToFill: result.length,
    }
  }

  // ==========================================================================
  // Graph Node Representation
  // ==========================================================================

  /**
   * Get concept as a graph node with adjacency info
   */
  getConceptNode(conceptId: string, userMastery?: Map<string, number>): ConceptNode | null {
    const concept = this.concepts.get(conceptId)
    if (!concept) return null

    return {
      id: concept.id,
      name: concept.name,
      difficulty: concept.difficulty_level,
      mastery: userMastery?.get(conceptId),
      prerequisites: this.getDirectPrerequisites(conceptId),
      dependents: Array.from(this.dependents.get(conceptId) || []),
    }
  }

  /**
   * Get all nodes for visualization
   */
  getAllNodes(userMastery?: Map<string, number>): ConceptNode[] {
    return Array.from(this.concepts.keys())
      .map((id) => this.getConceptNode(id, userMastery))
      .filter((n): n is ConceptNode => n !== null)
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  /**
   * Check if the graph has a concept
   */
  hasConcept(conceptId: string): boolean {
    return this.concepts.has(conceptId)
  }

  /**
   * Get the size of the graph
   */
  get size(): number {
    return this.concepts.size
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.prerequisites.clear()
    this.dependents.clear()
    this.concepts.clear()
    this.strengths.clear()
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create and load a prerequisite graph
 */
export async function createPrerequisiteGraph(options?: {
  subject?: string
  topic?: string
  conceptIds?: string[]
}): Promise<PrerequisiteGraph> {
  const graph = new PrerequisiteGraph()

  if (options?.conceptIds) {
    await graph.loadForConcepts(options.conceptIds)
  } else {
    await graph.loadFromDatabase(options)
  }

  return graph
}
