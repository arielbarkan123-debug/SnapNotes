import type { TikzTemplate } from '../index'

export const EVEN_ODD_NUMBERS_TEMPLATE: TikzTemplate = {
  id: 'even-odd-numbers',
  name: 'Even and Odd Numbers',
  keywords: [
    'even numbers', 'odd numbers', 'even or odd', 'even and odd',
    'divisible by two', 'pairs of objects',
  ],
  gradeRange: [1, 3],
  topics: [176],
  category: 'even-odd-numbers',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Title
  \\node[font=\\large\\bfseries] at (5.5, 6.5) {Even and Odd Numbers};
  % === LEFT: Even Number (6) ===
  \\node[font=\\footnotesize\\bfseries, blue!70] at (2.2, 5.7) {Even Numbers};
  % Draw 6 dots in 3 pairs
  \\fill[blue!60] (1.2, 4.8) circle (0.22);
  \\fill[blue!60] (1.8, 4.8) circle (0.22);
  \\draw[thick, blue!40] (1.2, 4.8) -- (1.8, 4.8);
  \\fill[blue!60] (1.2, 4.2) circle (0.22);
  \\fill[blue!60] (1.8, 4.2) circle (0.22);
  \\draw[thick, blue!40] (1.2, 4.2) -- (1.8, 4.2);
  \\fill[blue!60] (1.2, 3.6) circle (0.22);
  \\fill[blue!60] (1.8, 3.6) circle (0.22);
  \\draw[thick, blue!40] (1.2, 3.6) -- (1.8, 3.6);
  % Brace and label
  \\draw[thick, decorate, decoration={brace, amplitude=4pt}] (2.2, 4.95) -- (2.2, 3.45);
  \\node[right=0.2cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (2.3, 4.2) {3 pairs};
  \\node[font=\\footnotesize\\bfseries, blue!70, fill=white, inner sep=2pt] at (2.2, 3.0) {6 -- Even};
  % === RIGHT: Odd Number (7) ===
  \\node[font=\\footnotesize\\bfseries, orange!70!black] at (7.5, 5.7) {Odd Numbers};
  % Draw 7 dots: 3 pairs + 1 leftover
  \\fill[orange!60] (6.5, 4.8) circle (0.22);
  \\fill[orange!60] (7.1, 4.8) circle (0.22);
  \\draw[thick, orange!40] (6.5, 4.8) -- (7.1, 4.8);
  \\fill[orange!60] (6.5, 4.2) circle (0.22);
  \\fill[orange!60] (7.1, 4.2) circle (0.22);
  \\draw[thick, orange!40] (6.5, 4.2) -- (7.1, 4.2);
  \\fill[orange!60] (6.5, 3.6) circle (0.22);
  \\fill[orange!60] (7.1, 3.6) circle (0.22);
  \\draw[thick, orange!40] (6.5, 3.6) -- (7.1, 3.6);
  % Leftover dot
  \\fill[red!60] (6.5, 3.0) circle (0.22);
  \\node[right=0.15cm, font=\\scriptsize\\bfseries, red!60, fill=white, inner sep=1pt] at (6.75, 3.0) {left over!};
  % Brace and label
  \\draw[thick, decorate, decoration={brace, amplitude=4pt}] (7.5, 4.95) -- (7.5, 2.85);
  \\node[right=0.2cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (7.6, 3.9) {3 pairs + 1};
  \\node[font=\\footnotesize\\bfseries, orange!70!black, fill=white, inner sep=2pt] at (7.5, 2.3) {7 -- Odd};
  % === BOTTOM: Number line 1-10 ===
  \\draw[very thick, -latex] (-0.3, 0.8) -- (11.3, 0.8);
  % Even numbers in blue circles
  \\fill[blue!60] (2, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (2, 0.8) {2};
  \\fill[blue!60] (4, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (4, 0.8) {4};
  \\fill[blue!60] (6, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (6, 0.8) {6};
  \\fill[blue!60] (8, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (8, 0.8) {8};
  \\fill[blue!60] (10, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (10, 0.8) {10};
  % Odd numbers in orange circles
  \\fill[orange!60] (1, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (1, 0.8) {1};
  \\fill[orange!60] (3, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (3, 0.8) {3};
  \\fill[orange!60] (5, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (5, 0.8) {5};
  \\fill[orange!60] (7, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (7, 0.8) {7};
  \\fill[orange!60] (9, 0.8) circle (0.32);
  \\node[font=\\scriptsize\\bfseries, white] at (9, 0.8) {9};
  % Legend
  \\node[font=\\scriptsize\\bfseries, blue!70] at (3.5, 0.1) {Blue = Even};
  \\node[font=\\scriptsize\\bfseries, orange!70!black] at (7.5, 0.1) {Orange = Odd};
\\end{tikzpicture}`,
}
