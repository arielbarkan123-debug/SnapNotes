import type { TikzTemplate } from '../index'

export const SYMMETRY_TEMPLATE: TikzTemplate = {
  id: 'symmetry',
  name: 'Symmetry',
  keywords: [
    'symmetry', 'line of symmetry', 'symmetric', 'mirror line',
    'reflective symmetry', 'fold line', 'symmetrical',
    'lines of symmetry',
  ],
  gradeRange: [4, 5],
  topics: [50],
  category: 'symmetry',
  referenceCode: `\\begin{tikzpicture}[scale=1.5]
  % Heart shape (symmetric) - left half
  \\fill[red!25] (0,0) -- (-1.5, 1.8) .. controls (-2.5, 2.8) and (-2.2, 0.5) .. (0, -1.5) -- cycle;
  \\draw[thick] (0,0) -- (-1.5, 1.8) .. controls (-2.5, 2.8) and (-2.2, 0.5) .. (0, -1.5);
  % Right half
  \\fill[red!15] (0,0) -- (1.5, 1.8) .. controls (2.5, 2.8) and (2.2, 0.5) .. (0, -1.5) -- cycle;
  \\draw[thick] (0,0) -- (1.5, 1.8) .. controls (2.5, 2.8) and (2.2, 0.5) .. (0, -1.5);
  % Line of symmetry
  \\draw[very thick, dashed, blue] (0, -2.2) -- (0, 3.2);
  \\node[blue, font=\\footnotesize, fill=white, inner sep=2pt, rotate=90] at (0.4, 0.5) {Line of Symmetry};
  % Label
  \\node[below=0.5cm, font=\\large] at (0, -2.2) {1 line of symmetry};
\\end{tikzpicture}`,
}
