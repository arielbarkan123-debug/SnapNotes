import type { TikzTemplate } from '../index'

export const EXPANDED_FORM_TEMPLATE: TikzTemplate = {
  id: 'expanded-form',
  name: 'Expanded Form',
  keywords: [
    'expanded form', 'decompose number', 'place value expanded',
    'number in expanded form', 'standard form expanded form',
    'break apart number', 'decomposing numbers',
  ],
  gradeRange: [1, 4],
  topics: [178, 179],
  category: 'expanded-form',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Title
  \\node[font=\\large\\bfseries] at (4.5, 6.8) {Expanded Form};
  % Large number at top
  \\node[font=\\Huge\\bfseries] at (4.5, 5.5) {352};
  % Arrow down
  \\draw[very thick, -latex, gray] (4.5, 4.9) -- (4.5, 4.2);
  % Expanded form
  \\node[font=\\Large\\bfseries, blue!70] at (2.0, 3.6) {300};
  \\node[font=\\Large\\bfseries] at (3.5, 3.6) {+};
  \\node[font=\\Large\\bfseries, green!50!black] at (5.0, 3.6) {50};
  \\node[font=\\Large\\bfseries] at (6.2, 3.6) {+};
  \\node[font=\\Large\\bfseries, orange!70!black] at (7.2, 3.6) {2};
  % Arrow down to place value boxes
  \\draw[thick, -latex, blue!60] (2.0, 3.1) -- (2.0, 2.4);
  \\draw[thick, -latex, green!50!black] (5.0, 3.1) -- (5.0, 2.4);
  \\draw[thick, -latex, orange!60] (7.2, 3.1) -- (7.2, 2.4);
  % === Place Value Boxes ===
  % Hundreds box (blue)
  \\draw[very thick, fill=blue!15, rounded corners=3pt] (0.5, 0.3) rectangle (3.5, 2.4);
  \\node[font=\\footnotesize\\bfseries, blue!70] at (2.0, 2.05) {Hundreds};
  \\draw[thick, blue!30] (0.5, 1.7) -- (3.5, 1.7);
  \\node[font=\\LARGE\\bfseries, blue!70] at (2.0, 1.2) {3};
  \\draw[thick, blue!30] (0.5, 0.8) -- (3.5, 0.8);
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (2.0, 0.55) {3 $\\times$ 100 = 300};
  % Tens box (green)
  \\draw[very thick, fill=green!15, rounded corners=3pt] (3.8, 0.3) rectangle (6.2, 2.4);
  \\node[font=\\footnotesize\\bfseries, green!50!black] at (5.0, 2.05) {Tens};
  \\draw[thick, green!30] (3.8, 1.7) -- (6.2, 1.7);
  \\node[font=\\LARGE\\bfseries, green!50!black] at (5.0, 1.2) {5};
  \\draw[thick, green!30] (3.8, 0.8) -- (6.2, 0.8);
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (5.0, 0.55) {5 $\\times$ 10 = 50};
  % Ones box (orange)
  \\draw[very thick, fill=orange!15, rounded corners=3pt] (6.5, 0.3) rectangle (8.5, 2.4);
  \\node[font=\\footnotesize\\bfseries, orange!70!black] at (7.5, 2.05) {Ones};
  \\draw[thick, orange!30] (6.5, 1.7) -- (8.5, 1.7);
  \\node[font=\\LARGE\\bfseries, orange!70!black] at (7.5, 1.2) {2};
  \\draw[thick, orange!30] (6.5, 0.8) -- (8.5, 0.8);
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (7.5, 0.55) {2 $\\times$ 1 = 2};
\\end{tikzpicture}`,
}
