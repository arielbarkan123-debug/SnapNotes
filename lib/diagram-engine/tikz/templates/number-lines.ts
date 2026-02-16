import type { TikzTemplate } from '../index'

export const NUMBER_LINES_TEMPLATE: TikzTemplate = {
  id: 'number-lines',
  name: 'Number Lines',
  keywords: [
    'number line', 'numberline', 'number-line',
    'hop on number line', 'jump on number line',
    'addition on number line', 'subtraction on number line',
    'plot on number line', 'mark on number line',
    'integers on number line', 'negative number line',
    'absolute value number line', 'inequality number line',
    'mean on number line', 'median on number line',
    'mixed number',
    'improper fraction', 'decimal number line',
  ],
  gradeRange: [1, 6],
  topics: [4, 5, 6, 8, 15, 16, 17, 19, 20, 30, 39, 42, 44, 46, 57, 70, 76, 78, 80],
  category: 'number-lines',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.9]
  \\draw[thick, -{Stealth[length=3mm]}] (-0.5,0) -- (11,0);
  \\foreach \\x in {0,...,10} {
    \\draw[thick] (\\x, -0.15) -- (\\x, 0.15);
    \\node[below=4pt] at (\\x, -0.15) {\\x};
  }
  % Hop arrows showing 3 + 4 = 7
  \\draw[thick, blue, -{Stealth[length=2mm]}] (3, 0.3) to[bend left=50] (7, 0.3);
  \\node[above=6pt, blue, font=\\small, fill=white, inner sep=2pt] at (5, 0.6) {+4};
  \\fill[red] (3, 0) circle (0.12);
  \\fill[red] (7, 0) circle (0.12);
\\end{tikzpicture}`,
}
