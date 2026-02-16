import type { TikzTemplate } from '../index'

export const VOLUME_NETS_TEMPLATE: TikzTemplate = {
  id: 'volume-nets',
  name: 'Volume and Nets',
  keywords: [
    'volume', 'unit cube', 'unit cubes', 'cubic units',
    'volume of rectangular prism', 'length width height',
    'net of', 'net diagram', 'unfolded shape',
    'surface area net', 'faces of a cube',
    'net of a cube', 'net of a prism',
  ],
  gradeRange: [5, 6],
  topics: [59, 74],
  category: 'volume-nets',
  referenceCode: `\\begin{tikzpicture}[scale=0.8]
  % Net of a rectangular prism (4x3x2)
  % Bottom face (center)
  \\draw[thick, fill=blue!10] (0,0) rectangle (4,3);
  \\node at (2, 1.5) {Bottom};
  % Top face (above bottom)
  \\draw[thick, fill=blue!10] (0,3) rectangle (4,6);
  \\node at (2, 4.5) {Top};
  % Front face (below bottom)
  \\draw[thick, fill=green!10] (0,-2) rectangle (4,0);
  \\node at (2, -1) {Front};
  % Back face (above top)
  \\draw[thick, fill=green!10] (0,6) rectangle (4,8);
  \\node at (2, 7) {Back};
  % Left face
  \\draw[thick, fill=orange!10] (-2,0) rectangle (0,3);
  \\node at (-1, 1.5) {Left};
  % Right face
  \\draw[thick, fill=orange!10] (4,0) rectangle (6,3);
  \\node at (5, 1.5) {Right};
  % Dimension labels
  \\node[below=4pt, font=\\small] at (2, -2) {4 units};
  \\node[left=4pt, font=\\small] at (-2, 1.5) {3 units};
  \\node[left=4pt, font=\\small] at (0, -1) {2 units};
  % Fold lines
  \\draw[thick, dashed, gray] (0,0) -- (4,0);
  \\draw[thick, dashed, gray] (0,3) -- (4,3);
  \\draw[thick, dashed, gray] (0,6) -- (4,6);
  \\draw[thick, dashed, gray] (0,0) -- (0,3);
  \\draw[thick, dashed, gray] (4,0) -- (4,3);
  % Volume formula
  \\node[below=1.0cm, font=\\large] at (2, -2) {V = $4 \\times 3 \\times 2 = 24$ cubic units};
\\end{tikzpicture}`,
}
