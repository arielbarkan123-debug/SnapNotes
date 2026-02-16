import type { TikzTemplate } from '../index'

export const TAPE_DIAGRAMS_TEMPLATE: TikzTemplate = {
  id: 'tape-diagrams',
  name: 'Tape Diagrams for Ratios',
  keywords: [
    'tape diagram', 'ratio tape', 'ratio diagram', 'ratio model',
    'ratio bar', 'ratio strip', 'part to part ratio',
    'part to whole ratio', 'simplify ratio visual',
    'ratio problem', 'ratio of',
  ],
  gradeRange: [6, 6],
  topics: [67, 68],
  category: 'tape-diagrams',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Ratio 3:2 (boys to girls)
  % Boys tape (3 segments)
  \\node[left=0.4cm, font=\\normalsize\\bfseries] at (0, 1.5) {Boys};
  \\draw[thick, fill=blue!20] (0, 1.0) rectangle (3, 2.0);
  \\draw[thick, fill=blue!20] (3, 1.0) rectangle (6, 2.0);
  \\draw[thick, fill=blue!20] (6, 1.0) rectangle (9, 2.0);
  \\node at (1.5, 1.5) {1};
  \\node at (4.5, 1.5) {1};
  \\node at (7.5, 1.5) {1};
  % Girls tape (2 segments)
  \\node[left=0.4cm, font=\\normalsize\\bfseries] at (0, -0.5) {Girls};
  \\draw[thick, fill=pink!30] (0, -1.0) rectangle (3, 0.0);
  \\draw[thick, fill=pink!30] (3, -1.0) rectangle (6, 0.0);
  \\node at (1.5, -0.5) {1};
  \\node at (4.5, -0.5) {1};
  % Ratio label
  \\node[right=0.6cm, font=\\large] at (9, 1.5) {3};
  \\node[right=0.6cm, font=\\large] at (6, -0.5) {2};
  % Ratio statement
  \\node[below=1.0cm, font=\\large] at (4.5, -1.0) {Ratio of boys to girls = 3 : 2};
\\end{tikzpicture}`,
}
