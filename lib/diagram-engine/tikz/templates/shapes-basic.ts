import type { TikzTemplate } from '../index'

export const SHAPES_BASIC_TEMPLATE: TikzTemplate = {
  id: 'shapes-basic',
  name: 'Basic Shapes',
  keywords: [
    'basic shape', 'shapes', 'circle shape', 'square shape',
    'triangle shape', 'rectangle shape', 'draw a circle',
    'draw a square', 'draw a triangle', 'draw a rectangle',
    'sides and corners', 'vertices', 'sides of a shape',
    'properties of shapes', 'identify shapes',
    'perimeter of square',
    'right angle shape',
    'pentagon', 'hexagon', 'octagon',
    'showing perimeter', 'calculate perimeter',
    'properties of a',
  ],
  gradeRange: [1, 3],
  topics: [9, 33, 34, 37],
  category: 'shapes-basic',
  referenceCode: `\\begin{tikzpicture}[scale=1.5]
  % Rectangle with labeled sides
  \\draw[thick, fill=blue!10] (0,0) rectangle (4,2.5);
  % Side labels
  \\node[below=4pt, font=\\normalsize] at (2, 0) {8 cm};
  \\node[above=4pt, font=\\normalsize] at (2, 2.5) {8 cm};
  \\node[left=4pt, font=\\normalsize] at (0, 1.25) {5 cm};
  \\node[right=4pt, font=\\normalsize] at (4, 1.25) {5 cm};
  % Right angle markers
  \\draw[thick] (0, 0.3) -- (0.3, 0.3) -- (0.3, 0);
  \\draw[thick] (3.7, 0) -- (3.7, 0.3) -- (4, 0.3);
  \\draw[thick] (0, 2.2) -- (0.3, 2.2) -- (0.3, 2.5);
  \\draw[thick] (3.7, 2.5) -- (3.7, 2.2) -- (4, 2.2);
  % Shape name
  \\node[below=0.8cm, font=\\large\\bfseries] at (2, 0) {Rectangle};
  % Perimeter label
  \\node[below=1.5cm, font=\\normalsize] at (2, 0) {Perimeter = 8 + 5 + 8 + 5 = 26 cm};
\\end{tikzpicture}`,
}
