import type { TikzTemplate } from '../index'

export const TALLY_MARKS_TEMPLATE: TikzTemplate = {
  id: 'tally-marks',
  name: 'Tally Marks',
  keywords: [
    'tally', 'tally marks', 'tally chart', 'tally count',
    'tally table', 'counting tally', 'groups of five tally',
  ],
  gradeRange: [1, 2],
  topics: [10],
  category: 'tally-marks',
  referenceCode: `\\begin{tikzpicture}[scale=1.2]
  % Group 1: 5 tallies (4 vertical + 1 diagonal)
  \\foreach \\x in {0,0.2,0.4,0.6} {
    \\draw[thick] (\\x, 0) -- (\\x, 0.7);
  }
  \\draw[thick] (-0.05, 0.15) -- (0.65, 0.55);
  % Group 2: 5 tallies
  \\foreach \\x in {1.0,1.2,1.4,1.6} {
    \\draw[thick] (\\x, 0) -- (\\x, 0.7);
  }
  \\draw[thick] (0.95, 0.15) -- (1.65, 0.55);
  % Group 3: 3 tallies (no diagonal)
  \\foreach \\x in {2.0,2.2,2.4} {
    \\draw[thick] (\\x, 0) -- (\\x, 0.7);
  }
  % Label
  \\node[right=0.4cm, font=\\large] at (2.5, 0.35) {= 13};
\\end{tikzpicture}`,
}
