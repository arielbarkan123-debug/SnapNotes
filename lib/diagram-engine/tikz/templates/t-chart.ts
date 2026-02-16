import type { TikzTemplate } from '../index'

export const T_CHART_TEMPLATE: TikzTemplate = {
  id: 't-chart',
  name: 'T-Chart',
  keywords: [
    't-chart', 't chart', 'two column chart',
    'pros and cons', 'pros cons',
    'advantages disadvantages',
    'compare two columns', 'two sided chart',
    'for and against', 'fact opinion chart',
  ],
  gradeRange: [1, 6],
  topics: [135],
  category: 't-chart',
  referenceCode: `\\begin{tikzpicture}[scale=1.3]
% Title
\\node[font=\\large\\bfseries] at (5, 6.5) {T-Chart};

% Horizontal line (top of T)
\\draw[very thick] (0, 5.5) -- (10, 5.5);

% Vertical line (stem of T)
\\draw[very thick] (5, 5.5) -- (5, 0);

% Column headers
\\node[font=\\footnotesize\\bfseries, fill=blue!15, minimum width=4.5cm, minimum height=0.8cm] at (2.5, 5.9) {Category A};
\\node[font=\\footnotesize\\bfseries, fill=red!15, minimum width=4.5cm, minimum height=0.8cm] at (7.5, 5.9) {Category B};

% Left column items
\\node[font=\\scriptsize, anchor=west] at (0.3, 4.8) {Item 1};
\\node[font=\\scriptsize, anchor=west] at (0.3, 4.0) {Item 2};
\\node[font=\\scriptsize, anchor=west] at (0.3, 3.2) {Item 3};
\\node[font=\\scriptsize, anchor=west] at (0.3, 2.4) {Item 4};
\\node[font=\\scriptsize, anchor=west] at (0.3, 1.6) {Item 5};

% Right column items
\\node[font=\\scriptsize, anchor=west] at (5.3, 4.8) {Item 1};
\\node[font=\\scriptsize, anchor=west] at (5.3, 4.0) {Item 2};
\\node[font=\\scriptsize, anchor=west] at (5.3, 3.2) {Item 3};
\\node[font=\\scriptsize, anchor=west] at (5.3, 2.4) {Item 4};
\\node[font=\\scriptsize, anchor=west] at (5.3, 1.6) {Item 5};

% Row dividers (light)
\\foreach \\y in {4.4, 3.6, 2.8, 2.0} {
  \\draw[thin, gray!25] (0, \\y) -- (10, \\y);
}

% Outer border
\\draw[thick] (0, 0) rectangle (10, 5.5);
\\end{tikzpicture}`,
}
