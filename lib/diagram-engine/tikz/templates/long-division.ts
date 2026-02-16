import type { TikzTemplate } from '../index'

export const LONG_DIVISION_TEMPLATE: TikzTemplate = {
  id: 'long-division',
  name: 'Long Division',
  keywords: [
    'long division', 'division steps', 'divide step by step',
    'division bracket', 'division algorithm',
    'how to divide', 'dividing numbers',
  ],
  gradeRange: [4, 5],
  topics: [41],
  category: 'long-division',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.0]
  % Division: 156 / 12 = 13
  % Divisor and bracket
  \\node[font=\\Large] at (0, 0) {12};
  \\draw[very thick] (0.6, -0.4) -- (0.6, 0.4) -- (4.0, 0.4);
  % Dividend
  \\node[font=\\Large] at (1.5, 0) {1};
  \\node[font=\\Large] at (2.2, 0) {5};
  \\node[font=\\Large] at (2.9, 0) {6};
  % Quotient (above the bracket)
  \\node[font=\\Large, blue] at (2.2, 0.8) {1};
  \\node[font=\\Large, blue] at (2.9, 0.8) {3};
  % Step 1: 12 x 1 = 12
  \\node[font=\\large, red] at (1.5, -0.8) {1};
  \\node[font=\\large, red] at (2.2, -0.8) {2};
  \\draw[thick] (1.0, -1.1) -- (2.7, -1.1);
  % Step 2: 15 - 12 = 3, bring down 6
  \\node[font=\\large] at (2.2, -1.5) {3};
  \\node[font=\\large] at (2.9, -1.5) {6};
  % Step 3: 12 x 3 = 36
  \\node[font=\\large, red] at (2.2, -2.3) {3};
  \\node[font=\\large, red] at (2.9, -2.3) {6};
  \\draw[thick] (1.7, -2.6) -- (3.4, -2.6);
  % Remainder
  \\node[font=\\large, green!50!black] at (2.9, -3.0) {0};
  % Bring-down arrow
  \\draw[thick, dashed, gray, -{Stealth[length=2mm]}] (2.9, -0.3) -- (2.9, -1.2);
  % Answer label
  \\node[below=0.5cm, font=\\large] at (2.2, -3.0) {$156 \\div 12 = 13$};
\\end{tikzpicture}`,
}
