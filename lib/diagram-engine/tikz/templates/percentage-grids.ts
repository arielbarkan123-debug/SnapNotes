import type { TikzTemplate } from '../index'

export const PERCENTAGE_GRIDS_TEMPLATE: TikzTemplate = {
  id: 'percentage-grids',
  name: 'Percentage Grids',
  keywords: [
    'percentage grid', 'percent grid', '100 grid', 'hundred grid',
    'percentage square', 'percent model', 'percent of',
    'shade percent', 'percentage visual', '10x10 grid',
    'percentage', 'percent', 'what is 25%', 'what is 50%',
  ],
  gradeRange: [6, 6],
  topics: [69],
  category: 'percentage-grids',
  referenceCode: `\\begin{tikzpicture}[scale=0.45]
  % 10x10 grid showing 35%
  % Shaded cells (35 out of 100)
  \\foreach \\row in {0,...,9} {
    \\foreach \\col in {0,...,9} {
      \\pgfmathtruncatemacro{\\cellnum}{\\row*10+\\col}
      \\ifnum\\cellnum<35
        \\fill[blue!30] (\\col, 9-\\row) rectangle ++(1,1);
      \\fi
      \\draw[thin, gray] (\\col, 9-\\row) rectangle ++(1,1);
    }
  }
  % Border
  \\draw[very thick] (0,0) rectangle (10,10);
  % Percentage label
  \\node[below=0.6cm, font=\\Large] at (5, 0) {35\\%};
  \\node[below=1.5cm, font=\\normalsize] at (5, 0) {35 out of 100 squares shaded};
\\end{tikzpicture}`,
}
