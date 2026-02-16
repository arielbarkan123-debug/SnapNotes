import type { TikzTemplate } from '../index'

export const FRACTION_CIRCLES_TEMPLATE: TikzTemplate = {
  id: 'fraction-circles',
  name: 'Fraction Circles',
  keywords: [
    'fraction circle', 'fraction pie', 'pie chart fraction',
    'shade fraction circle', 'fraction of a circle',
    'halves circle', 'thirds circle', 'fourths circle', 'quarters circle',
    'equivalent fraction circle',
    'show fraction', 'shade fraction',
  ],
  gradeRange: [2, 4],
  topics: [22, 31, 32],
  category: 'fraction-circles',
  referenceCode: `\\begin{tikzpicture}[scale=1.5]
  % Draw full circle outline
  \\draw[thick] (0,0) circle (1);
  % Shaded portion: 3/4
  \\fill[blue!30] (0,0) -- (90:1) arc (90:-180:1) -- cycle;
  % Division lines for 4 equal parts
  \\foreach \\a in {0, 90, 180, 270} {
    \\draw[thick] (0,0) -- (\\a:1);
  }
  % Labels
  \\node[font=\\large] at (0, -0.3) {$\\frac{3}{4}$};
  \\node[below=8pt, font=\\normalsize] at (0, -1) {Three-fourths shaded};
\\end{tikzpicture}`,
}
