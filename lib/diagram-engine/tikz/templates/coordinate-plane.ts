import type { TikzTemplate } from '../index'

export const COORDINATE_PLANE_TEMPLATE: TikzTemplate = {
  id: 'coordinate-plane',
  name: 'Coordinate Plane',
  keywords: [
    'coordinate plane', 'coordinate grid', 'ordered pair',
    'plot point', 'plot points', 'x-axis y-axis',
    'first quadrant', 'four quadrants', 'all quadrants',
    'graphing points', 'coordinate graph',
    'origin', 'ordered pairs',
  ],
  gradeRange: [5, 6],
  topics: [58, 71],
  category: 'coordinate-plane',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.8]
  % Grid
  \\draw[gray!20, thin] (-5,-5) grid (5,5);
  % Axes
  \\draw[very thick, -{Stealth[length=3mm]}] (-5.5,0) -- (5.5,0) node[right, font=\\normalsize] {$x$};
  \\draw[very thick, -{Stealth[length=3mm]}] (0,-5.5) -- (0,5.5) node[above, font=\\normalsize] {$y$};
  % Tick labels
  \\foreach \\x in {-5,...,-1,1,2,...,5} {
    \\node[below=3pt, font=\\footnotesize] at (\\x, 0) {\\x};
  }
  \\foreach \\y in {-5,...,-1,1,2,...,5} {
    \\node[left=3pt, font=\\footnotesize] at (0, \\y) {\\y};
  }
  \\node[below left=3pt, font=\\footnotesize] at (0,0) {0};
  % Plotted points
  \\fill[red] (2, 3) circle (0.12);
  \\node[above right=3pt, red, font=\\small, fill=white, inner sep=1pt] at (2, 3) {A(2, 3)};
  \\fill[blue] (-3, 1) circle (0.12);
  \\node[above left=3pt, blue, font=\\small, fill=white, inner sep=1pt] at (-3, 1) {B(-3, 1)};
  \\fill[green!50!black] (4, -2) circle (0.12);
  \\node[below right=3pt, green!50!black, font=\\small, fill=white, inner sep=1pt] at (4, -2) {C(4, -2)};
  \\fill[orange!80!black] (-1, -4) circle (0.12);
  \\node[below left=3pt, orange!80!black, font=\\small, fill=white, inner sep=1pt] at (-1, -4) {D(-1, -4)};
\\end{tikzpicture}`,
}
