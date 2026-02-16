import type { TikzTemplate } from '../index'

export const PERIMETER_AREA_ELEMENTARY_TEMPLATE: TikzTemplate = {
  id: 'perimeter-area-elementary',
  name: 'Perimeter and Area',
  keywords: [
    'perimeter', 'find the perimeter', 'area of rectangle', 'area by counting',
    'grid area', 'perimeter and area', 'square units', 'perimeter of rectangle',
    'area of square', 'distance around',
  ],
  gradeRange: [2, 5],
  topics: [172, 173],
  category: 'perimeter-area-elementary',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Title
  \\node[font=\\large\\bfseries] at (5.5, 5.8) {Perimeter and Area};
  % === LEFT SIDE: Perimeter ===
  \\node[font=\\footnotesize\\bfseries] at (1.5, 5.0) {Perimeter};
  % Rectangle with colored border
  \\draw[very thick, blue!70] (0, 1.5) -- (3, 1.5);
  \\draw[very thick, red!70] (3, 1.5) -- (3, 3.5);
  \\draw[very thick, blue!70] (3, 3.5) -- (0, 3.5);
  \\draw[very thick, red!70] (0, 3.5) -- (0, 1.5);
  % Fill with light color
  \\fill[yellow!8] (0.03, 1.53) rectangle (2.97, 3.47);
  % Redraw border on top
  \\draw[very thick, blue!70] (0, 1.5) -- (3, 1.5);
  \\draw[very thick, red!70] (3, 1.5) -- (3, 3.5);
  \\draw[very thick, blue!70] (3, 3.5) -- (0, 3.5);
  \\draw[very thick, red!70] (0, 3.5) -- (0, 1.5);
  % Side labels
  \\node[below=0.15cm, font=\\footnotesize\\bfseries, blue!70, fill=white, inner sep=1pt] at (1.5, 1.5) {6 cm};
  \\node[above=0.15cm, font=\\footnotesize\\bfseries, blue!70, fill=white, inner sep=1pt] at (1.5, 3.5) {6 cm};
  \\node[left=0.15cm, font=\\footnotesize\\bfseries, red!70, fill=white, inner sep=1pt] at (0, 2.5) {4 cm};
  \\node[right=0.15cm, font=\\footnotesize\\bfseries, red!70, fill=white, inner sep=1pt] at (3, 2.5) {4 cm};
  % Formula
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt] at (1.5, 0.7) {P = 6 + 4 + 6 + 4 = 20 cm};
  % === RIGHT SIDE: Area ===
  \\node[font=\\footnotesize\\bfseries] at (8.5, 5.0) {Area};
  % Grid 5x3
  % Row 1
  \\fill[green!25] (6.5, 1.5) rectangle (7.5, 2.5);
  \\fill[green!25] (7.5, 1.5) rectangle (8.5, 2.5);
  \\fill[green!25] (8.5, 1.5) rectangle (9.5, 2.5);
  \\fill[green!25] (9.5, 1.5) rectangle (10.5, 2.5);
  \\fill[green!25] (10.5, 1.5) rectangle (11.5, 2.5);
  % Row 2
  \\fill[green!25] (6.5, 2.5) rectangle (7.5, 3.5);
  \\fill[green!25] (7.5, 2.5) rectangle (8.5, 3.5);
  \\fill[green!25] (8.5, 2.5) rectangle (9.5, 3.5);
  \\fill[green!35] (9.5, 2.5) rectangle (10.5, 3.5);
  \\fill[green!35] (10.5, 2.5) rectangle (11.5, 3.5);
  % Row 3
  \\fill[green!35] (6.5, 3.5) rectangle (7.5, 4.5);
  \\fill[green!35] (7.5, 3.5) rectangle (8.5, 4.5);
  \\fill[green!35] (8.5, 3.5) rectangle (9.5, 4.5);
  \\fill[green!35] (9.5, 3.5) rectangle (10.5, 4.5);
  \\fill[green!35] (10.5, 3.5) rectangle (11.5, 4.5);
  % Grid lines
  \\draw[thick] (6.5, 1.5) grid[step=1] (11.5, 4.5);
  \\draw[very thick] (6.5, 1.5) rectangle (11.5, 4.5);
  % Dimension labels
  \\node[below=0.15cm, font=\\footnotesize\\bfseries, fill=white, inner sep=1pt] at (9, 1.5) {5 units};
  \\node[left=0.15cm, font=\\footnotesize\\bfseries, fill=white, inner sep=1pt] at (6.5, 3.0) {3 units};
  % Formula
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt] at (9, 0.7) {A = 5 $\\times$ 3 = 15 square units};
\\end{tikzpicture}`,
}
