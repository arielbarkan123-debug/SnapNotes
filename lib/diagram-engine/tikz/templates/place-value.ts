import type { TikzTemplate } from '../index'

export const PLACE_VALUE_TEMPLATE: TikzTemplate = {
  id: 'place-value',
  name: 'Place Value Charts',
  keywords: [
    'place value', 'place-value', 'tens and ones', 'hundreds tens ones',
    'base 10', 'base ten', 'base-10',
    'decimal place value', 'tenths hundredths',
    'ones tens hundreds', 'place value chart',
  ],
  gradeRange: [1, 4],
  topics: [7, 18, 45],
  category: 'place-value',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Column headers
  \\node[font=\\bfseries] at (0, 3.5) {Hundreds};
  \\node[font=\\bfseries] at (3, 3.5) {Tens};
  \\node[font=\\bfseries] at (6, 3.5) {Ones};
  % Vertical dividers
  \\draw[thick] (1.5, -0.5) -- (1.5, 3.0);
  \\draw[thick] (4.5, -0.5) -- (4.5, 3.0);
  % Horizontal line below headers
  \\draw[thick] (-1.5, 3.0) -- (7.5, 3.0);
  % Border
  \\draw[thick] (-1.5, -0.5) rectangle (7.5, 3.0);
  % Base-10 blocks for 352
  % Hundreds: 3 large squares
  \\foreach \\i in {0,1,2} {
    \\draw[fill=blue!15, thick] ({-1.2+\\i*0.9}, 0.5) rectangle ({-0.4+\\i*0.9}, 2.5);
    \\draw[step=0.2] ({-1.2+\\i*0.9}, 0.5) grid ({-0.4+\\i*0.9}, 2.5);
  }
  % Tens: 5 tall rectangles
  \\foreach \\i in {0,...,4} {
    \\draw[fill=green!15, thick] ({1.7+\\i*0.5}, 0.5) rectangle ({2.0+\\i*0.5}, 2.5);
  }
  % Ones: 2 small squares
  \\foreach \\i in {0,1} {
    \\draw[fill=orange!15, thick] ({4.8+\\i*0.6}, 0.5) rectangle ({5.2+\\i*0.6}, 0.9);
  }
  % Digit labels
  \\node[font=\\Large\\bfseries] at (0, -0.1) {3};
  \\node[font=\\Large\\bfseries] at (3, -0.1) {5};
  \\node[font=\\Large\\bfseries] at (6, -0.1) {2};
  % Number label
  \\node[below=0.6cm, font=\\large] at (3, -0.5) {352 = 300 + 50 + 2};
\\end{tikzpicture}`,
}
