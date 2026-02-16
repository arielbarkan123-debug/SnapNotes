import type { TikzTemplate } from '../index'

export const SHAPES_CLASSIFIED_TEMPLATE: TikzTemplate = {
  id: 'shapes-classified',
  name: 'Classified Shapes',
  keywords: [
    'classify triangle', 'classifying triangles', 'types of triangles',
    'equilateral', 'isosceles', 'scalene',
    'right triangle type', 'obtuse triangle', 'acute triangle',
    'classify quadrilateral', 'classifying quadrilaterals',
    'types of quadrilaterals', 'quadrilateral hierarchy',
    'parallelogram trapezoid rhombus',
    'trapezoid', 'parallelogram', 'rhombus',
    'area of triangle', 'area of a triangle',
    'area of trapezoid', 'area of a trapezoid',
    'area of parallelogram', 'area of a parallelogram',
  ],
  gradeRange: [5, 6],
  topics: [61, 62, 72, 73],
  category: 'shapes-classified',
  referenceCode: `\\begin{tikzpicture}[scale=1.5]
  % Isosceles triangle
  \\coordinate (A) at (0, 0);
  \\coordinate (B) at (4, 0);
  \\coordinate (C) at (2, 3);
  \\draw[very thick, fill=blue!10] (A) -- (B) -- (C) -- cycle;
  % Side lengths
  \\node[below=4pt, font=\\normalsize] at (2, 0) {6 cm};
  \\node[above left=2pt, font=\\normalsize, rotate=56] at (1, 1.5) {5 cm};
  \\node[above right=2pt, font=\\normalsize, rotate=-56] at (3, 1.5) {5 cm};
  % Equal side tick marks
  \\draw[thick] (0.85, 1.2) -- (1.05, 1.4);
  \\draw[thick] (2.95, 1.4) -- (3.15, 1.2);
  % Angle arcs
  \\draw[thick, red] (0.5, 0) arc (0:56:0.5);
  \\node[red, font=\\footnotesize, fill=white, inner sep=1pt] at (0.8, 0.3) {$53^{\\circ}$};
  \\draw[thick, red] (3.5, 0) arc (180:124:0.5);
  \\node[red, font=\\footnotesize, fill=white, inner sep=1pt] at (3.2, 0.3) {$53^{\\circ}$};
  \\draw[thick, blue] (2, 2.3) arc (-90+56:-90-56:0.5);
  \\node[blue, font=\\footnotesize, fill=white, inner sep=1pt] at (2, 2.5) {$74^{\\circ}$};
  % Classification
  \\node[below=1.0cm, font=\\large\\bfseries] at (2, 0) {Isosceles Triangle};
  \\node[below=1.7cm, font=\\normalsize] at (2, 0) {Two equal sides, two equal angles};
\\end{tikzpicture}`,
}
