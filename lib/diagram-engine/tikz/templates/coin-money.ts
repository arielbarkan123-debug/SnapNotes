import type { TikzTemplate } from '../index'

export const COIN_MONEY_TEMPLATE: TikzTemplate = {
  id: 'coin-money',
  name: 'Coins and Money',
  keywords: [
    'coin', 'coins', 'penny', 'nickel', 'dime', 'quarter',
    'counting money', 'counting coins', 'dollars and cents',
    'how much money', 'money value', 'coin value',
    'making change', 'cents',
  ],
  gradeRange: [1, 2],
  topics: [12, 26, 174, 175],
  category: 'coin-money',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Quarter
  \\draw[very thick, fill=gray!20] (0, 0) circle (0.9);
  \\node[font=\\small\\bfseries] at (0, 0.15) {25};
  \\node[font=\\tiny] at (0, -0.2) {cents};
  \\node[below=0.4cm, font=\\footnotesize] at (0, -0.9) {Quarter};
  % Dime
  \\draw[very thick, fill=gray!15] (2.5, 0) circle (0.6);
  \\node[font=\\small\\bfseries] at (2.5, 0.1) {10};
  \\node[font=\\tiny] at (2.5, -0.15) {cents};
  \\node[below=0.4cm, font=\\footnotesize] at (2.5, -0.9) {Dime};
  % Nickel
  \\draw[very thick, fill=gray!25] (4.7, 0) circle (0.75);
  \\node[font=\\small\\bfseries] at (4.7, 0.1) {5};
  \\node[font=\\tiny] at (4.7, -0.15) {cents};
  \\node[below=0.4cm, font=\\footnotesize] at (4.7, -0.9) {Nickel};
  % Penny
  \\draw[very thick, fill=orange!30] (6.7, 0) circle (0.65);
  \\node[font=\\small\\bfseries] at (6.7, 0.1) {1};
  \\node[font=\\tiny] at (6.7, -0.15) {cent};
  \\node[below=0.4cm, font=\\footnotesize] at (6.7, -0.9) {Penny};
  % Running total
  \\node[below=1.8cm, font=\\large] at (3.35, -0.9) {$25 + 10 + 5 + 1 = 41$ cents};
\\end{tikzpicture}`,
}
