import type { TikzTemplate } from '../index'

export const AREA_MODELS_TEMPLATE: TikzTemplate = {
  id: 'area-models',
  name: 'Area Models',
  keywords: [
    'area model', 'area model multiplication', 'box method',
    'partial products', 'area multiplication',
    'distributive property area', 'rectangle multiplication',
    'multiplying fractions area', 'fraction area model',
    'multi-digit multiplication area',
  ],
  gradeRange: [3, 5],
  topics: [29, 40, 55],
  category: 'area-models',
  referenceCode: `\\begin{tikzpicture}[scale=0.7]
  % 13 x 4 = (10+3) x 4
  % Large rectangle
  \\draw[thick, fill=blue!15] (0,0) rectangle (10,4);
  \\draw[thick, fill=green!15] (10,0) rectangle (13,4);
  % Dividing line
  \\draw[thick, dashed] (10,0) -- (10,4);
  % Dimension labels
  \\node[above=4pt, font=\\normalsize] at (5, 4) {10};
  \\node[above=4pt, font=\\normalsize] at (11.5, 4) {3};
  \\node[left=4pt, font=\\normalsize] at (0, 2) {4};
  % Product labels inside
  \\node[font=\\large] at (5, 2) {$10 \\times 4 = 40$};
  \\node[font=\\large] at (11.5, 2) {$3 \\times 4 = 12$};
  % Total
  \\node[below=8pt, font=\\large] at (6.5, 0) {$13 \\times 4 = 40 + 12 = 52$};
\\end{tikzpicture}`,
}
