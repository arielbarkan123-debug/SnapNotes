import type { TikzTemplate } from '../index'

export const MULTIPLICATION_TABLE_TEMPLATE: TikzTemplate = {
  id: 'multiplication-table',
  name: 'Multiplication Table',
  keywords: [
    'multiplication table', 'times table', 'multiplication chart',
    'multiplication facts', 'times tables', 'multiply chart',
  ],
  gradeRange: [2, 4],
  topics: [177],
  category: 'multiplication-table',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Title
  \\node[font=\\large\\bfseries] at (3.5, 8.2) {Multiplication Table};
  % Grid dimensions: 7 columns x 7 rows (header + 6 data)
  % Each cell is 1cm x 0.9cm
  % === Header row background ===
  \\fill[blue!25] (0, 6.3) rectangle (7, 7.2);
  % === Header column background ===
  \\fill[blue!25] (0, 0.9) rectangle (1, 7.2);
  % === Corner cell ===
  \\fill[blue!40] (0, 6.3) rectangle (1, 7.2);
  \\node[font=\\footnotesize\\bfseries] at (0.5, 6.75) {$\\times$};
  % === Header row numbers ===
  \\node[font=\\footnotesize\\bfseries] at (1.5, 6.75) {1};
  \\node[font=\\footnotesize\\bfseries] at (2.5, 6.75) {2};
  \\node[font=\\footnotesize\\bfseries] at (3.5, 6.75) {3};
  \\node[font=\\footnotesize\\bfseries] at (4.5, 6.75) {4};
  \\node[font=\\footnotesize\\bfseries] at (5.5, 6.75) {5};
  \\node[font=\\footnotesize\\bfseries] at (6.5, 6.75) {6};
  % === Header column numbers ===
  \\node[font=\\footnotesize\\bfseries] at (0.5, 5.85) {1};
  \\node[font=\\footnotesize\\bfseries] at (0.5, 4.95) {2};
  \\node[font=\\footnotesize\\bfseries] at (0.5, 4.05) {3};
  \\node[font=\\footnotesize\\bfseries] at (0.5, 3.15) {4};
  \\node[font=\\footnotesize\\bfseries] at (0.5, 2.25) {5};
  \\node[font=\\footnotesize\\bfseries] at (0.5, 1.35) {6};
  % === Perfect squares highlighted in yellow ===
  \\fill[yellow!40] (1, 5.4) rectangle (2, 6.3);
  \\fill[yellow!40] (2, 4.5) rectangle (3, 5.4);
  \\fill[yellow!40] (3, 3.6) rectangle (4, 4.5);
  \\fill[yellow!40] (4, 2.7) rectangle (5, 3.6);
  \\fill[yellow!40] (5, 1.8) rectangle (6, 2.7);
  \\fill[yellow!40] (6, 0.9) rectangle (7, 1.8);
  % === Row 1 (x1): 1, 2, 3, 4, 5, 6 ===
  \\node[font=\\footnotesize] at (1.5, 5.85) {1};
  \\node[font=\\footnotesize] at (2.5, 5.85) {2};
  \\node[font=\\footnotesize] at (3.5, 5.85) {3};
  \\node[font=\\footnotesize] at (4.5, 5.85) {4};
  \\node[font=\\footnotesize] at (5.5, 5.85) {5};
  \\node[font=\\footnotesize] at (6.5, 5.85) {6};
  % === Row 2 (x2): 2, 4, 6, 8, 10, 12 ===
  \\node[font=\\footnotesize] at (1.5, 4.95) {2};
  \\node[font=\\footnotesize\\bfseries] at (2.5, 4.95) {4};
  \\node[font=\\footnotesize] at (3.5, 4.95) {6};
  \\node[font=\\footnotesize] at (4.5, 4.95) {8};
  \\node[font=\\footnotesize] at (5.5, 4.95) {10};
  \\node[font=\\footnotesize] at (6.5, 4.95) {12};
  % === Row 3 (x3): 3, 6, 9, 12, 15, 18 ===
  \\node[font=\\footnotesize] at (1.5, 4.05) {3};
  \\node[font=\\footnotesize] at (2.5, 4.05) {6};
  \\node[font=\\footnotesize\\bfseries] at (3.5, 4.05) {9};
  \\node[font=\\footnotesize] at (4.5, 4.05) {12};
  \\node[font=\\footnotesize] at (5.5, 4.05) {15};
  \\node[font=\\footnotesize] at (6.5, 4.05) {18};
  % === Row 4 (x4): 4, 8, 12, 16, 20, 24 ===
  \\node[font=\\footnotesize] at (1.5, 3.15) {4};
  \\node[font=\\footnotesize] at (2.5, 3.15) {8};
  \\node[font=\\footnotesize] at (3.5, 3.15) {12};
  \\node[font=\\footnotesize\\bfseries] at (4.5, 3.15) {16};
  \\node[font=\\footnotesize] at (5.5, 3.15) {20};
  \\node[font=\\footnotesize] at (6.5, 3.15) {24};
  % === Row 5 (x5): 5, 10, 15, 20, 25, 30 ===
  \\node[font=\\footnotesize] at (1.5, 2.25) {5};
  \\node[font=\\footnotesize] at (2.5, 2.25) {10};
  \\node[font=\\footnotesize] at (3.5, 2.25) {15};
  \\node[font=\\footnotesize] at (4.5, 2.25) {20};
  \\node[font=\\footnotesize\\bfseries] at (5.5, 2.25) {25};
  \\node[font=\\footnotesize] at (6.5, 2.25) {30};
  % === Row 6 (x6): 6, 12, 18, 24, 30, 36 ===
  \\node[font=\\footnotesize] at (1.5, 1.35) {6};
  \\node[font=\\footnotesize] at (2.5, 1.35) {12};
  \\node[font=\\footnotesize] at (3.5, 1.35) {18};
  \\node[font=\\footnotesize] at (4.5, 1.35) {24};
  \\node[font=\\footnotesize] at (5.5, 1.35) {30};
  \\node[font=\\footnotesize\\bfseries] at (6.5, 1.35) {36};
  % === Grid lines ===
  \\draw[thick] (0, 0.9) grid[xstep=1, ystep=0.9] (7, 7.2);
  \\draw[very thick] (0, 0.9) rectangle (7, 7.2);
  % Thick line separating headers
  \\draw[very thick] (1, 0.9) -- (1, 7.2);
  \\draw[very thick] (0, 6.3) -- (7, 6.3);
  % Legend
  \\node[font=\\scriptsize, fill=yellow!40, inner sep=2pt] at (2.5, 0.4) {Yellow};
  \\node[font=\\scriptsize] at (4.5, 0.4) {= Perfect Squares};
\\end{tikzpicture}`,
}
