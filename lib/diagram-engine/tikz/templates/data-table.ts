import type { TikzTemplate } from '../index'

export const DATA_TABLE_TEMPLATE: TikzTemplate = {
  id: 'data-table',
  name: 'Data Table',
  keywords: [
    'data table', 'data chart',
    'experiment data table', 'record data',
    'data collection table', 'results table',
    'observation table', 'science data table',
    'tally table', 'recording sheet',
    'experiment table', 'record results',
    'experiment results',
  ],
  gradeRange: [2, 6],
  topics: [154],
  category: 'data-table',
  referenceCode: `\\begin{tikzpicture}[scale=1.2]
% Title
\\node[font=\\large\\bfseries] at (5, 6) {Data Table};

% Table header row
\\fill[blue!20] (0, 4.5) rectangle (10, 5.3);
\\draw[very thick] (0, 4.5) rectangle (10, 5.3);

% Column headers
\\node[font=\\footnotesize\\bfseries] at (1.5, 4.9) {Trial};
\\node[font=\\footnotesize\\bfseries] at (4, 4.9) {Variable};
\\node[font=\\footnotesize\\bfseries] at (7, 4.9) {Measurement};
\\node[font=\\footnotesize\\bfseries] at (9.2, 4.9) {Notes};

% Column dividers
\\draw[thick] (2.5, 0) -- (2.5, 5.3);
\\draw[thick] (5.5, 0) -- (5.5, 5.3);
\\draw[thick] (8.2, 0) -- (8.2, 5.3);

% Row 1
\\fill[gray!5] (0, 3.6) rectangle (10, 4.5);
\\node[font=\\scriptsize] at (1.5, 4.05) {1};
\\draw[thick] (0, 3.6) -- (10, 3.6);

% Row 2
\\node[font=\\scriptsize] at (1.5, 3.15) {2};
\\draw[thick] (0, 2.7) -- (10, 2.7);

% Row 3
\\fill[gray!5] (0, 1.8) rectangle (10, 2.7);
\\node[font=\\scriptsize] at (1.5, 2.25) {3};
\\draw[thick] (0, 1.8) -- (10, 1.8);

% Row 4
\\node[font=\\scriptsize] at (1.5, 1.35) {4};
\\draw[thick] (0, 0.9) -- (10, 0.9);

% Row 5
\\fill[gray!5] (0, 0) rectangle (10, 0.9);
\\node[font=\\scriptsize] at (1.5, 0.45) {5};

% Outer border
\\draw[very thick] (0, 0) rectangle (10, 5.3);

% Average row
\\fill[yellow!15] (0, -0.8) rectangle (10, 0);
\\draw[very thick] (0, -0.8) rectangle (10, 0);
\\node[font=\\footnotesize\\bfseries] at (1.5, -0.4) {Average};
\\draw[thick] (2.5, -0.8) -- (2.5, 0);
\\draw[thick] (5.5, -0.8) -- (5.5, 0);
\\draw[thick] (8.2, -0.8) -- (8.2, 0);
\\end{tikzpicture}`,
}
