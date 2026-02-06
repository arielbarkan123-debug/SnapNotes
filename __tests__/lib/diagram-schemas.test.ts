import { DIAGRAM_SCHEMAS, getDiagramSchemaPrompt } from '@/lib/diagram-schemas'

describe('DIAGRAM_SCHEMAS', () => {
  it('has schemas for all currently implemented math types', () => {
    const mathTypes = [
      'long_division', 'equation', 'fraction', 'number_line',
      'coordinate_plane', 'factoring', 'completing_square',
      'polynomial', 'radical', 'systems', 'inequality',
    ]
    for (const type of mathTypes) {
      expect(DIAGRAM_SCHEMAS[type]).toBeDefined()
      expect(DIAGRAM_SCHEMAS[type].type).toBe(type)
      expect(DIAGRAM_SCHEMAS[type].description).toBeTruthy()
      expect(DIAGRAM_SCHEMAS[type].jsonExample).toBeTruthy()
    }
  })

  it('has schemas for elementary math types', () => {
    const elementaryTypes = [
      'counting_objects_array', 'ten_frame', 'part_part_whole', 'bar_model',
      'place_value_chart', 'base_10_blocks', 'picture_graph', 'bar_graph',
      'fraction_circle', 'fraction_bar', 'fraction_number_line',
      'multiplication_array', 'area_model_multiplication', 'scaled_bar_graph',
      'equivalent_fraction_model', 'mixed_number_model', 'decimal_grid',
      'fraction_multiplication_area', 'fraction_division_model', 'volume_model',
      'order_of_operations_tree', 'quadrant_one_coordinate_plane',
    ]
    for (const type of elementaryTypes) {
      expect(DIAGRAM_SCHEMAS[type]).toBeDefined()
      expect(DIAGRAM_SCHEMAS[type].type).toBe(type)
      expect(DIAGRAM_SCHEMAS[type].subject).toBe('math')
    }
  })

  it('has schemas for middle school math types', () => {
    const middleSchoolTypes = [
      'double_number_line', 'ratio_table', 'tape_diagram_ratio',
      'percent_bar_model', 'dot_plot', 'histogram', 'box_plot',
      'stem_and_leaf_plot', 'measures_of_center', 'probability_tree',
      'sample_space_diagram', 'venn_diagram', 'net_diagram_3d',
      'cross_section_diagram', 'scale_drawing', 'slope_triangle',
      'system_of_equations_graph', 'scatter_plot_trend_line',
      'two_way_frequency_table', 'pythagorean_theorem_diagram',
      'transformation_diagram',
    ]
    for (const type of middleSchoolTypes) {
      expect(DIAGRAM_SCHEMAS[type]).toBeDefined()
      expect(DIAGRAM_SCHEMAS[type].type).toBe(type)
      expect(DIAGRAM_SCHEMAS[type].subject).toBe('math')
    }
  })

  it('has schemas for high school math types', () => {
    const highSchoolTypes = [
      'quadratic_graph', 'residual_plot', 'complex_number_plane',
      'conic_sections', 'polynomial_graph', 'exponential_graph',
      'logarithmic_graph', 'rational_function_graph',
      'binomial_distribution', 'probability_distribution',
      'parametric_curve', 'limit_visualization', 'derivative_tangent_line',
    ]
    for (const type of highSchoolTypes) {
      expect(DIAGRAM_SCHEMAS[type]).toBeDefined()
      expect(DIAGRAM_SCHEMAS[type].type).toBe(type)
      expect(DIAGRAM_SCHEMAS[type].subject).toBe('math')
    }
  })

  it('has schemas for geometry types', () => {
    const geometryTypes = [
      'triangle_geometry', 'regular_polygon',
      'angle_types', 'complementary_supplementary', 'vertical_angles',
      'parallel_lines_transversal', 'triangle_angle_sum',
      'exterior_angle_theorem', 'perpendicular_bisector_construction',
      'rotation_coordinate_plane', 'dilation_coordinate_plane',
      'tessellation_pattern', 'inscribed_angle_theorem',
      'triangle_congruence', 'triangle_similarity',
      'law_of_sines_cosines', 'transformations_composition',
      'orthographic_views_3d', 'tangent_radius_perpendicularity',
    ]
    for (const type of geometryTypes) {
      expect(DIAGRAM_SCHEMAS[type]).toBeDefined()
      expect(DIAGRAM_SCHEMAS[type].type).toBe(type)
      expect(DIAGRAM_SCHEMAS[type].subject).toBe('geometry')
    }
  })

  it('has schemas for physics types', () => {
    expect(DIAGRAM_SCHEMAS.fbd).toBeDefined()
    expect(DIAGRAM_SCHEMAS.fbd.subject).toBe('physics')
  })

  it('each schema has required fields', () => {
    for (const [key, schema] of Object.entries(DIAGRAM_SCHEMAS)) {
      expect(schema.type).toBe(key)
      expect(schema.subject).toBeTruthy()
      expect(schema.description).toBeTruthy()
      expect(schema.jsonExample).toBeTruthy()
    }
  })

  it('jsonExample is valid JSON for each schema', () => {
    for (const [key, schema] of Object.entries(DIAGRAM_SCHEMAS)) {
      expect(() => JSON.parse(schema.jsonExample)).not.toThrow()
      const parsed = JSON.parse(schema.jsonExample)
      expect(parsed.type).toBe(key)
    }
  })

  it('jsonExample has visibleStep and data fields', () => {
    for (const [key, schema] of Object.entries(DIAGRAM_SCHEMAS)) {
      const parsed = JSON.parse(schema.jsonExample)
      expect(parsed.visibleStep).toBe(0)
      expect(parsed.totalSteps).toBeGreaterThanOrEqual(2)
      expect(parsed.data).toBeDefined()
    }
  })

  it('has the expected total number of schemas', () => {
    const count = Object.keys(DIAGRAM_SCHEMAS).length
    // Original: 18 (math 15 + geometry 2 + physics 1)
    // New: 22 elementary + 21 middle + 13 high school + 17 geometry = 73
    // Total: 18 + 73 = 91
    expect(count).toBeGreaterThanOrEqual(91)
  })
})

describe('getDiagramSchemaPrompt', () => {
  it('returns prompt string listing all schemas', () => {
    const prompt = getDiagramSchemaPrompt()
    expect(prompt).toContain('coordinate_plane')
    expect(prompt).toContain('number_line')
    expect(prompt).toContain('fbd')
    expect(prompt).toContain('counting_objects_array')
    expect(prompt).toContain('quadratic_graph')
    expect(prompt).toContain('angle_types')
  })

  it('filters by subject', () => {
    const mathPrompt = getDiagramSchemaPrompt('math')
    expect(mathPrompt).toContain('coordinate_plane')
    expect(mathPrompt).toContain('counting_objects_array')
    expect(mathPrompt).toContain('quadratic_graph')
    expect(mathPrompt).not.toContain('fbd')
    expect(mathPrompt).not.toContain('angle_types')

    const physicsPrompt = getDiagramSchemaPrompt('physics')
    expect(physicsPrompt).toContain('fbd')
    expect(physicsPrompt).not.toContain('coordinate_plane')

    const geometryPrompt = getDiagramSchemaPrompt('geometry')
    expect(geometryPrompt).toContain('angle_types')
    expect(geometryPrompt).toContain('triangle_geometry')
    // Should not contain math-only coordinate_plane (but may contain rotation_coordinate_plane etc.)
    expect(geometryPrompt).not.toContain('Diagram Schema: coordinate_plane\n')
    expect(geometryPrompt).not.toContain('Diagram Schema: fbd')
  })

  it('returns empty string for unknown subject', () => {
    const prompt = getDiagramSchemaPrompt('underwater_basket_weaving')
    expect(prompt).toBe('')
  })
})
