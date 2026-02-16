import type { TikzTemplate } from '../index'

export const THREE_D_SHAPES_TEMPLATE: TikzTemplate = {
  id: '3d-shapes',
  name: '3D Shapes',
  keywords: [
    '3d shapes', 'three dimensional shapes', 'cube', 'sphere', 'cylinder',
    'cone', 'rectangular prism', 'pyramid shape', 'faces edges vertices',
    '3d shape properties', 'solid shapes', 'solid figures',
  ],
  gradeRange: [1, 4],
  topics: [170, 171],
  category: '3d-shapes',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Title
  \\node[font=\\large\\bfseries] at (6, 5.5) {3D Shapes};
  % --- CUBE ---
  % Back face (dashed)
  \\draw[thick, dashed, gray] (0.8, 1.8) -- (2.8, 1.8) -- (2.8, 3.8) -- (0.8, 3.8) -- cycle;
  % Front face
  \\draw[very thick, fill=blue!15] (0, 1) -- (2, 1) -- (2, 3) -- (0, 3) -- cycle;
  % Connecting edges
  \\draw[very thick] (0, 3) -- (0.8, 3.8);
  \\draw[very thick] (2, 3) -- (2.8, 3.8);
  \\draw[very thick] (2, 1) -- (2.8, 1.8);
  \\draw[thick, dashed, gray] (0, 1) -- (0.8, 1.8);
  % Top face
  \\draw[very thick, fill=blue!8] (0, 3) -- (0.8, 3.8) -- (2.8, 3.8) -- (2, 3) -- cycle;
  % Right face
  \\draw[very thick, fill=blue!12] (2, 1) -- (2.8, 1.8) -- (2.8, 3.8) -- (2, 3) -- cycle;
  % Label
  \\node[font=\\footnotesize\\bfseries] at (1, 0.3) {Cube};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt] at (1, -0.2) {F:6 E:12 V:8};
  % --- CYLINDER ---
  % Body
  \\draw[very thick, fill=green!15] (4, 1) ellipse (0.9 and 0.35);
  \\draw[very thick] (3.1, 1) -- (3.1, 3.3);
  \\draw[very thick] (4.9, 1) -- (4.9, 3.3);
  % Top ellipse
  \\draw[very thick, fill=green!8] (4, 3.3) ellipse (0.9 and 0.35);
  % Bottom back (dashed)
  \\draw[thick, dashed, gray] (3.1, 1) arc (180:360:0.9 and 0.35);
  % Label
  \\node[font=\\footnotesize\\bfseries] at (4, 0.3) {Cylinder};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt] at (4, -0.2) {F:3 E:2 V:0};
  % --- CONE ---
  % Base ellipse
  \\draw[very thick, fill=red!15] (7, 1) ellipse (0.9 and 0.35);
  % Sides to apex
  \\draw[very thick] (6.1, 1) -- (7, 3.8);
  \\draw[very thick] (7.9, 1) -- (7, 3.8);
  % Back of base (dashed)
  \\draw[thick, dashed, gray] (6.1, 1) arc (180:360:0.9 and 0.35);
  % Apex point
  \\fill[red!60] (7, 3.8) circle (0.06);
  % Label
  \\node[font=\\footnotesize\\bfseries] at (7, 0.3) {Cone};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt] at (7, -0.2) {F:2 E:1 V:1};
  % --- TRIANGULAR PYRAMID ---
  % Base triangle (partially dashed)
  \\draw[very thick, fill=orange!15] (9.2, 1) -- (11.2, 1) -- (10.5, 1.7) -- cycle;
  \\draw[thick, dashed, gray] (9.2, 1) -- (10.5, 1.7);
  % Apex
  \\draw[very thick] (9.2, 1) -- (10.2, 3.8);
  \\draw[very thick] (11.2, 1) -- (10.2, 3.8);
  \\draw[very thick] (10.5, 1.7) -- (10.2, 3.8);
  % Apex point
  \\fill[orange!60] (10.2, 3.8) circle (0.06);
  % Shading for front face
  \\draw[very thick, fill=orange!10] (9.2, 1) -- (11.2, 1) -- (10.2, 3.8) -- cycle;
  % Label
  \\node[font=\\footnotesize\\bfseries] at (10.2, 0.3) {Pyramid};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt] at (10.2, -0.2) {F:4 E:6 V:4};
\\end{tikzpicture}`,
}
