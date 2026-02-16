import type { TikzTemplate } from '../index'

export const ARRAYS_GRIDS_TEMPLATE: TikzTemplate = {
  id: 'arrays-grids',
  name: 'Arrays and Grids',
  keywords: [
    'array', 'multiplication array', 'rows and columns',
    'counting squares', 'grid of dots', 'dot array',
    'area counting', 'square grid', 'unit squares',
    'even number array', 'odd number array',
    'skip counting array',
    'equal groups', 'equal sharing', 'repeated addition',
    'division as groups', 'division as sharing',
    'groups of', 'rows of',
  ],
  gradeRange: [2, 4],
  topics: [20, 21, 27, 28, 34, 69],
  category: 'arrays-grids',
  referenceCode: `\\begin{tikzpicture}[scale=0.8]
  % 3 rows x 5 columns array
  \\foreach \\row in {0,1,2} {
    \\foreach \\col in {0,...,4} {
      \\fill[blue!60] (\\col*1.0, \\row*1.0) circle (0.3);
    }
  }
  % Row label
  \\node[left=0.4cm, font=\\normalsize] at (0, 1) {3 rows};
  % Column label
  \\node[above=0.4cm, font=\\normalsize] at (2, 2) {5 columns};
  % Result
  \\node[below=0.6cm, font=\\large] at (2, 0) {$3 \\times 5 = 15$};
\\end{tikzpicture}`,
}
