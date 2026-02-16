import type { TikzTemplate } from '../index'

export const NUMBER_BONDS_TEMPLATE: TikzTemplate = {
  id: 'number-bonds',
  name: 'Number Bonds',
  keywords: [
    'number bond', 'number bonds', 'part part whole', 'part-part-whole',
    'parts and whole', 'bond diagram', 'fact family',
    'addition bond', 'subtraction bond',
  ],
  gradeRange: [1, 2],
  topics: [3],
  category: 'number-bonds',
  referenceCode: `\\begin{tikzpicture}[scale=1.2]
  \\node[circle, draw, thick, minimum size=1.2cm, fill=blue!10] (whole) at (0,1.5) {\\textbf{8}};
  \\node[circle, draw, thick, minimum size=1.2cm, fill=green!10] (partA) at (-1.2,0) {\\textbf{5}};
  \\node[circle, draw, thick, minimum size=1.2cm, fill=orange!10] (partB) at (1.2,0) {\\textbf{3}};
  \\draw[thick] (whole) -- (partA);
  \\draw[thick] (whole) -- (partB);
  \\node[above=0.2cm, font=\\footnotesize] at (whole.north) {Whole};
  \\node[below=0.2cm, font=\\footnotesize] at (partA.south) {Part};
  \\node[below=0.2cm, font=\\footnotesize] at (partB.south) {Part};
\\end{tikzpicture}`,
}
