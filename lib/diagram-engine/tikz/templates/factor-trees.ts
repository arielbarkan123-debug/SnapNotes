import type { TikzTemplate } from '../index'

export const FACTOR_TREES_TEMPLATE: TikzTemplate = {
  id: 'factor-trees',
  name: 'Factor Trees',
  keywords: [
    'factor tree', 'prime factorization', 'factor pairs',
    'prime factors', 'factor pair', 'factoring tree',
    'factors of', 'find the factors',
    'order of operations', 'pemdas', 'bodmas',
    'exponent', 'power of', 'to the power',
    'squared', 'cubed',
  ],
  gradeRange: [4, 6],
  topics: [53, 60, 64],
  category: 'factor-trees',
  referenceCode: `\\begin{tikzpicture}[scale=1.2,
    every node/.style={circle, draw, thick, minimum size=0.9cm, font=\\normalsize}]
  % Root
  \\node[fill=yellow!15] (n60) at (0, 0) {60};
  % Level 1
  \\node[fill=white] (n6) at (-1.5, -1.5) {6};
  \\node[fill=white] (n10) at (1.5, -1.5) {10};
  % Level 2
  \\node[fill=green!20, thick] (p2a) at (-2.5, -3) {\\textbf{2}};
  \\node[fill=green!20, thick] (p3) at (-0.5, -3) {\\textbf{3}};
  \\node[fill=green!20, thick] (p2b) at (0.5, -3) {\\textbf{2}};
  \\node[fill=green!20, thick] (p5) at (2.5, -3) {\\textbf{5}};
  % Connections
  \\draw[thick] (n60) -- (n6);
  \\draw[thick] (n60) -- (n10);
  \\draw[thick] (n6) -- (p2a);
  \\draw[thick] (n6) -- (p3);
  \\draw[thick] (n10) -- (p2b);
  \\draw[thick] (n10) -- (p5);
  % Result
  \\node[draw=none, rectangle, font=\\large] at (0, -4.2) {$60 = 2 \\times 2 \\times 3 \\times 5 = 2^{2} \\times 3 \\times 5$};
\\end{tikzpicture}`,
}
