import type { DiagramSchema } from './types'

/**
 * Geometry diagram schemas — core and extended.
 */
export const geometrySchemas: Record<string, DiagramSchema> = {
  // ---- GEOMETRY: Currently Implemented ----

  triangle_geometry: {
    type: 'triangle_geometry',
    subject: 'geometry',
    gradeRange: '7-12',
    engine: 'geogebra',
    description: 'Geometry triangle with side lengths, angles, height, area/perimeter calculations',
    jsonExample: JSON.stringify({
      type: 'triangle_geometry',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        type: 'scalene',
        vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
        sides: {
          a: 10,
          b: 12,
          c: 8,
          labels: { a: '10 cm', b: '12 cm', c: '8 cm' },
        },
        angles: { A: 55.77, B: 82.82, C: 41.41 },
        height: { value: 7.5, from: 'A', showLine: true },
        title: 'Find the area of triangle ABC',
        showFormulas: true,
      },
    }),
  },

  regular_polygon: {
    type: 'regular_polygon',
    subject: 'geometry',
    gradeRange: '7-12',
    engine: 'geogebra',
    description: 'Regular polygon with side length, apothem, central angle, and interior angle',
    jsonExample: JSON.stringify({
      type: 'regular_polygon',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        sides: 6,
        sideLength: 5,
        sideLabel: '5 cm',
        showApothem: true,
        showCentralAngle: true,
        showInteriorAngle: true,
        title: 'Regular hexagon',
        showFormulas: true,
      },
    }),
  },

  // ---- GEOMETRY: New Schemas ----

  angle_types: {
    type: 'angle_types',
    subject: 'geometry',
    gradeRange: '7-8',
    engine: 'geogebra',
    description: 'Diagram showing different angle types (acute, right, obtuse, straight, reflex)',
    jsonExample: JSON.stringify({
      type: 'angle_types',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angles: [
          { measure: 45, type: 'acute', label: '45\u00b0', vertex: { x: 100, y: 100 }, ray1Angle: 0, ray2Angle: 45 },
          { measure: 90, type: 'right', label: '90\u00b0', vertex: { x: 250, y: 100 }, ray1Angle: 0, ray2Angle: 90 },
        ],
        title: 'Types of Angles',
      },
    }),
  },

  complementary_supplementary: {
    type: 'complementary_supplementary',
    subject: 'geometry',
    gradeRange: '7-8',
    engine: 'geogebra',
    description: 'Two angles that are complementary (sum to 90) or supplementary (sum to 180)',
    jsonExample: JSON.stringify({
      type: 'complementary_supplementary',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angle1: 60,
        angle2: 30,
        relationship: 'complementary',
        showSum: true,
        vertex: { x: 150, y: 150 },
        title: 'Complementary angles: 60\u00b0 + 30\u00b0 = 90\u00b0',
      },
    }),
  },

  vertical_angles: {
    type: 'vertical_angles',
    subject: 'geometry',
    gradeRange: '7-8',
    engine: 'geogebra',
    description: 'Two intersecting lines forming vertical (opposite) angle pairs',
    jsonExample: JSON.stringify({
      type: 'vertical_angles',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angle1: 65,
        angle2: 65,
        intersection: { x: 150, y: 150 },
        showCongruenceMarks: true,
        title: 'Vertical angles are congruent',
      },
    }),
  },

  parallel_lines_transversal: {
    type: 'parallel_lines_transversal',
    subject: 'geometry',
    gradeRange: '7-8',
    engine: 'geogebra',
    description: 'Two parallel lines cut by a transversal showing angle relationships',
    jsonExample: JSON.stringify({
      type: 'parallel_lines_transversal',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        line1Y: 80,
        line2Y: 200,
        transversalAngle: 60,
        highlightAngles: [{ position: 'interior', side: 'alternate', type: 'alternate_interior' }],
        showAngleMeasures: true,
        title: 'Parallel lines and transversal',
      },
    }),
  },

  triangle_angle_sum: {
    type: 'triangle_angle_sum',
    subject: 'geometry',
    gradeRange: '7-8',
    engine: 'geogebra',
    description: 'Triangle showing that interior angles sum to 180 degrees',
    jsonExample: JSON.stringify({
      type: 'triangle_angle_sum',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angles: [60, 70, 50],
        vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
        labels: ['A', 'B', 'C'],
        showSum: true,
        title: '60\u00b0 + 70\u00b0 + 50\u00b0 = 180\u00b0',
      },
    }),
  },

  exterior_angle_theorem: {
    type: 'exterior_angle_theorem',
    subject: 'geometry',
    gradeRange: '7-8',
    engine: 'geogebra',
    description: 'Triangle exterior angle equals sum of two non-adjacent interior angles',
    jsonExample: JSON.stringify({
      type: 'exterior_angle_theorem',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        interiorAngles: [50, 60, 70],
        exteriorAngle: 110,
        exteriorAtVertex: 2,
        vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
        showRelationship: true,
        title: 'Exterior angle = 50\u00b0 + 60\u00b0 = 110\u00b0',
      },
    }),
  },

  perpendicular_bisector_construction: {
    type: 'perpendicular_bisector_construction',
    subject: 'geometry',
    gradeRange: '9-10',
    engine: 'geogebra',
    description: 'Compass-and-straightedge construction of a perpendicular bisector',
    jsonExample: JSON.stringify({
      type: 'perpendicular_bisector_construction',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        point1: { x: 50, y: 150 },
        point2: { x: 250, y: 150 },
        showConstruction: true,
        showArcs: true,
        showBisector: true,
        showMidpoint: true,
        title: 'Perpendicular bisector construction',
      },
    }),
  },

  rotation_coordinate_plane: {
    type: 'rotation_coordinate_plane',
    subject: 'geometry',
    gradeRange: '8-10',
    engine: 'geogebra',
    description: 'Shape rotated about a center point on the coordinate plane',
    jsonExample: JSON.stringify({
      type: 'rotation_coordinate_plane',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        originalVertices: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
        centerOfRotation: { x: 0, y: 0 },
        angleDegrees: 90,
        showCenter: true,
        showArc: true,
        showPrime: true,
        title: '90\u00b0 rotation about origin',
      },
    }),
  },

  dilation_coordinate_plane: {
    type: 'dilation_coordinate_plane',
    subject: 'geometry',
    gradeRange: '8-10',
    engine: 'geogebra',
    description: 'Shape dilated from a center point by a scale factor',
    jsonExample: JSON.stringify({
      type: 'dilation_coordinate_plane',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        originalVertices: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
        centerOfDilation: { x: 0, y: 0 },
        scaleFactor: 2,
        showCenter: true,
        showRays: true,
        showPrime: true,
        title: 'Dilation with scale factor 2',
      },
    }),
  },

  tessellation_pattern: {
    type: 'tessellation_pattern',
    subject: 'geometry',
    gradeRange: '8-10',
    engine: 'geogebra',
    description: 'Tiling pattern with repeated congruent shapes covering a plane',
    jsonExample: JSON.stringify({
      type: 'tessellation_pattern',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        baseShape: 'hexagon',
        rows: 3,
        columns: 4,
        showTransformations: true,
        colors: ['#3b82f6', '#22c55e', '#f59e0b'],
        title: 'Hexagonal tessellation',
      },
    }),
  },

  inscribed_angle_theorem: {
    type: 'inscribed_angle_theorem',
    subject: 'geometry',
    gradeRange: '9-12',
    engine: 'geogebra',
    description: 'Circle showing inscribed angle is half the central angle subtending the same arc',
    jsonExample: JSON.stringify({
      type: 'inscribed_angle_theorem',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        radius: 100,
        centralAngle: 80,
        inscribedAngle: 40,
        arcAngle: 80,
        inscribedVertex: 180,
        arcEndpoints: [30, 110],
        showRelationship: true,
        title: 'Inscribed angle = \u00bd central angle',
      },
    }),
  },

  triangle_congruence: {
    type: 'triangle_congruence',
    subject: 'geometry',
    gradeRange: '9-12',
    engine: 'geogebra',
    description: 'Two triangles with marked congruent parts and a congruence criterion (SSS, SAS, ASA, AAS, HL)',
    jsonExample: JSON.stringify({
      type: 'triangle_congruence',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        triangle1: { vertices: [{ x: 50, y: 50 }, { x: 50, y: 200 }, { x: 200, y: 200 }], sides: [5, 7, 5], angles: [45, 90, 45] },
        triangle2: { vertices: [{ x: 250, y: 50 }, { x: 250, y: 200 }, { x: 400, y: 200 }], sides: [5, 7, 5], angles: [45, 90, 45] },
        criterion: 'SAS',
        correspondingParts: [{ type: 'side', index1: 0, index2: 0 }, { type: 'angle', index1: 1, index2: 1 }, { type: 'side', index1: 1, index2: 1 }],
        showCongruenceMarks: true,
        title: 'SAS Congruence',
      },
    }),
  },

  triangle_similarity: {
    type: 'triangle_similarity',
    subject: 'geometry',
    gradeRange: '9-12',
    engine: 'geogebra',
    description: 'Two similar triangles with proportional sides and equal angles',
    jsonExample: JSON.stringify({
      type: 'triangle_similarity',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        triangle1: { vertices: [{ x: 50, y: 50 }, { x: 50, y: 150 }, { x: 150, y: 150 }], sides: [3, 4, 5], angles: [37, 90, 53] },
        triangle2: { vertices: [{ x: 250, y: 50 }, { x: 250, y: 250 }, { x: 450, y: 250 }], sides: [6, 8, 10], angles: [37, 90, 53] },
        criterion: 'AA',
        scaleFactor: 2,
        showRatios: true,
        title: 'AA Similarity (scale factor 2)',
      },
    }),
  },

  law_of_sines_cosines: {
    type: 'law_of_sines_cosines',
    subject: 'geometry',
    gradeRange: '10-12',
    engine: 'geogebra',
    description: 'Triangle with labeled sides and angles for Law of Sines or Law of Cosines',
    jsonExample: JSON.stringify({
      type: 'law_of_sines_cosines',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        triangle: {
          vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
          sides: [8, 10, 12],
          angles: [41.4, 55.8, 82.8],
        },
        law: 'cosines',
        solveFor: 'side',
        knownParts: ['a=8', 'b=10', 'C=82.8\u00b0'],
        showFormula: true,
        showSubstitution: true,
        title: 'Law of Cosines: find side c',
      },
    }),
  },

  transformations_composition: {
    type: 'transformations_composition',
    subject: 'geometry',
    gradeRange: '9-12',
    engine: 'geogebra',
    description: 'Composition of multiple geometric transformations applied in sequence',
    jsonExample: JSON.stringify({
      type: 'transformations_composition',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        originalShape: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
        transformations: [
          { type: 'reflection', params: { axis: 'y-axis' } },
          { type: 'translation', params: { dx: 2, dy: 3 } },
        ],
        finalShape: [{ x: 1, y: 4 }, { x: -1, y: 4 }, { x: 0, y: 6 }],
        showIntermediate: true,
        showOrder: true,
        title: 'Reflect then translate',
      },
    }),
  },

  orthographic_views_3d: {
    type: 'orthographic_views_3d',
    subject: 'geometry',
    gradeRange: '9-12',
    engine: 'svg',
    description: 'Front, side, and top orthographic views of a 3D solid',
    jsonExample: JSON.stringify({
      type: 'orthographic_views_3d',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        shape: 'l_shape',
        views: {
          front: [[1, 1], [1, 0]],
          side: [[1, 1], [1, 0]],
          top: [[1, 1], [1, 0]],
        },
        show3DModel: true,
        title: 'Orthographic views of L-shape',
      },
    }),
  },

  tangent_radius_perpendicularity: {
    type: 'tangent_radius_perpendicularity',
    subject: 'geometry',
    gradeRange: '9-12',
    engine: 'geogebra',
    description: 'Circle showing that a radius to a tangent point is perpendicular to the tangent line',
    jsonExample: JSON.stringify({
      type: 'tangent_radius_perpendicularity',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        radius: 100,
        tangentPoint: 0,
        showRightAngle: true,
        showTangentLine: true,
        showRadius: true,
        title: 'Tangent \u22a5 Radius',
      },
    }),
  },

  // ============================================================================
  // GEOMETRY: Basic Shapes (for AI generation)
  // ============================================================================

  square: {
    type: 'square',
    subject: 'geometry',
    gradeRange: '3-8',
    engine: 'geogebra',
    description: 'Square with side length, area, perimeter, and optional diagonals',
    jsonExample: JSON.stringify({
      type: 'square',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        side: 6,
        sideLabel: 'a',
        showDiagonals: true,
        diagonalLabel: 'd',
        title: 'Square with Side 6',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  rectangle: {
    type: 'rectangle',
    subject: 'geometry',
    gradeRange: '3-8',
    engine: 'geogebra',
    description: 'Rectangle with width, height, area, perimeter, and optional diagonals',
    jsonExample: JSON.stringify({
      type: 'rectangle',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        width: 8,
        height: 5,
        widthLabel: 'w',
        heightLabel: 'h',
        showDiagonals: true,
        diagonalLabel: 'd',
        title: 'Rectangle 8 x 5',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  parallelogram: {
    type: 'parallelogram',
    subject: 'geometry',
    gradeRange: '6-10',
    engine: 'geogebra',
    description: 'Parallelogram with base, side, height, and angle',
    jsonExample: JSON.stringify({
      type: 'parallelogram',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        base: 10,
        side: 6,
        height: 5,
        baseLabel: 'b',
        sideLabel: 's',
        heightLabel: 'h',
        angle: 60,
        showHeight: true,
        title: 'Parallelogram',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  rhombus: {
    type: 'rhombus',
    subject: 'geometry',
    gradeRange: '6-10',
    engine: 'geogebra',
    description: 'Rhombus with side length and diagonals',
    jsonExample: JSON.stringify({
      type: 'rhombus',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        side: 5,
        diagonal1: 8,
        diagonal2: 6,
        sideLabel: 's',
        d1Label: 'd\u2081',
        d2Label: 'd\u2082',
        showDiagonals: true,
        title: 'Rhombus',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  trapezoid: {
    type: 'trapezoid',
    subject: 'geometry',
    gradeRange: '6-10',
    engine: 'geogebra',
    description: 'Trapezoid with parallel bases and height',
    jsonExample: JSON.stringify({
      type: 'trapezoid',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        topBase: 6,
        bottomBase: 10,
        height: 4,
        topLabel: 'a',
        bottomLabel: 'b',
        heightLabel: 'h',
        showHeight: true,
        isIsosceles: true,
        title: 'Trapezoid',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  // ============================================================================
  // MATH: Utility Tables (for AI generation)
  // ============================================================================

  area_model: {
    type: 'area_model',
    subject: 'math',
    gradeRange: '3-8',
    engine: 'svg',
    description: 'Area model for multiplication showing partitioned rectangle',
    jsonExample: JSON.stringify({
      type: 'area_model',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        factor1: 23,
        factor2: 15,
        showPartials: true,
        decomposition1: [20, 3],
        decomposition2: [10, 5],
        title: '23 \u00d7 15 Area Model',
      },
    }),
  },

  math_table: {
    type: 'math_table',
    subject: 'math',
    gradeRange: '3-12',
    engine: 'svg',
    description: 'General-purpose data table for math problems',
    jsonExample: JSON.stringify({
      type: 'math_table',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        title: 'Function Values',
        rows: [
          [{ content: 'x', isHeader: true }, { content: 'f(x) = 2x + 1', isHeader: true }],
          [{ content: '-2', isHeader: false }, { content: '-3', isHeader: false }],
          [{ content: '-1', isHeader: false }, { content: '-1', isHeader: false }],
          [{ content: '0', isHeader: false, highlight: true }, { content: '1', isHeader: false, highlight: true }],
          [{ content: '1', isHeader: false }, { content: '3', isHeader: false }],
          [{ content: '2', isHeader: false }, { content: '5', isHeader: false }],
        ],
      },
    }),
  },
}
