import type { TikzTemplate } from '../index'

export const KWL_CHART_TEMPLATE: TikzTemplate = {
  id: 'kwl-chart',
  name: 'KWL Chart',
  keywords: [
    'kwl chart', 'kwl',
    'know want learn', 'know want to know learned',
    'k-w-l', 'what i know',
    'what i want to know', 'what i learned',
    'prior knowledge chart',
  ],
  gradeRange: [1, 6],
  topics: [136],
  category: 'kwl-chart',
  referenceCode: `\\begin{tikzpicture}[scale=1.2]
% Title
\\node[font=\\large\\bfseries] at (6, 7) {KWL Chart};

% Topic line
\\node[font=\\footnotesize\\bfseries] at (6, 6.3) {Topic: \\underline{\\hspace{5cm}}};

% Three columns
% K column
\\fill[blue!10] (0, 0) rectangle (4, 5.5);
\\draw[very thick] (0, 0) rectangle (4, 5.5);
\\node[font=\\footnotesize\\bfseries, fill=blue!25, minimum width=3.8cm, minimum height=0.8cm] at (2, 5.5) {K};
\\node[font=\\scriptsize, blue!70] at (2, 4.9) {What I Know};

% W column
\\fill[green!10] (4, 0) rectangle (8, 5.5);
\\draw[very thick] (4, 0) rectangle (8, 5.5);
\\node[font=\\footnotesize\\bfseries, fill=green!25, minimum width=3.8cm, minimum height=0.8cm] at (6, 5.5) {W};
\\node[font=\\scriptsize, green!60!black] at (6, 4.9) {What I Want to Know};

% L column
\\fill[red!8] (8, 0) rectangle (12, 5.5);
\\draw[very thick] (8, 0) rectangle (12, 5.5);
\\node[font=\\footnotesize\\bfseries, fill=red!20, minimum width=3.8cm, minimum height=0.8cm] at (10, 5.5) {L};
\\node[font=\\scriptsize, red!60] at (10, 4.9) {What I Learned};

% Ruled lines for writing
\\foreach \\y in {0.5, 1.2, 1.9, 2.6, 3.3, 4.0} {
  \\draw[thin, gray!25] (0.2, \\y) -- (3.8, \\y);
  \\draw[thin, gray!25] (4.2, \\y) -- (7.8, \\y);
  \\draw[thin, gray!25] (8.2, \\y) -- (11.8, \\y);
}
\\end{tikzpicture}`,
}
