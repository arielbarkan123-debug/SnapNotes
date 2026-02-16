import type { TikzTemplate } from '../index'

export const EQUATION_BALANCE_TEMPLATE: TikzTemplate = {
  id: 'equation-balance',
  name: 'Equation Balance',
  keywords: [
    'equation balance', 'balance scale', 'algebra model',
    'balance equation', 'algebraic expression model',
    'equation model', 'variable model',
    'solve equation visual', 'balance algebra',
    'inequality model',
  ],
  gradeRange: [6, 6],
  topics: [79],
  category: 'equation-balance',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Fulcrum (triangle)
  \\fill[gray!40] (5, 0) -- (4.5, -0.8) -- (5.5, -0.8) -- cycle;
  \\draw[thick] (5, 0) -- (4.5, -0.8) -- (5.5, -0.8) -- cycle;
  % Balance beam
  \\draw[very thick] (1, 0) -- (9, 0);
  % Left pan
  \\draw[thick] (1, 0) -- (0.5, -0.3) -- (2.5, -0.3) -- (2, 0);
  \\draw[thick, fill=gray!10] (0.5, -0.3) -- (0.3, -0.5) -- (2.7, -0.5) -- (2.5, -0.3) -- cycle;
  % Right pan
  \\draw[thick] (8, 0) -- (7.5, -0.3) -- (9.5, -0.3) -- (9, 0);
  \\draw[thick, fill=gray!10] (7.5, -0.3) -- (7.3, -0.5) -- (9.7, -0.5) -- (9.5, -0.3) -- cycle;
  % Left side: x + 3
  \\draw[thick, fill=blue!25] (0.8, -0.1) rectangle (1.6, 0.6);
  \\node[font=\\normalsize\\bfseries] at (1.2, 0.25) {$x$};
  \\foreach \\i in {0,1,2} {
    \\fill[orange!60] ({1.8+\\i*0.3}, 0.1) circle (0.12);
  }
  \\node[above=0.3cm, font=\\normalsize] at (1.5, 0.6) {$x + 3$};
  % Right side: 7
  \\foreach \\i in {0,...,6} {
    \\fill[orange!60] ({7.6+\\i*0.3}, 0.1) circle (0.12);
  }
  \\node[above=0.3cm, font=\\normalsize] at (8.5, 0.6) {$7$};
  % Equation label
  \\node[below=0.8cm, font=\\large] at (5, -0.8) {$x + 3 = 7$};
  \\node[below=1.5cm, font=\\normalsize, green!50!black] at (5, -0.8) {$x = 4$};
\\end{tikzpicture}`,
}
