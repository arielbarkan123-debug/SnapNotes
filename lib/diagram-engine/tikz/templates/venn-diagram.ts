import type { TikzTemplate } from '../index'

export const VENN_DIAGRAM_TEMPLATE: TikzTemplate = {
  id: 'venn-diagram',
  name: 'Venn Diagram',
  keywords: [
    'venn diagram', 'compare and contrast',
    'similarities differences',
    'overlapping circles', 'compare two things',
    'what is the same different',
    'venn compare', 'comparison diagram',
  ],
  gradeRange: [1, 6],
  topics: [131],
  category: 'venn-diagram',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% Title
\\node[font=\\large\\bfseries] at (4, 5) {Venn Diagram: Compare and Contrast};

% Left circle
\\fill[blue!15, opacity=0.7] (2.5, 2.5) circle (2);
\\draw[very thick, blue!60] (2.5, 2.5) circle (2);

% Right circle
\\fill[red!15, opacity=0.7] (5.5, 2.5) circle (2);
\\draw[very thick, red!60] (5.5, 2.5) circle (2);

% Labels
\\node[font=\\footnotesize\\bfseries, blue!70] at (1.3, 4.2) {Topic A};
\\node[font=\\footnotesize\\bfseries, red!70] at (6.7, 4.2) {Topic B};
\\node[font=\\footnotesize\\bfseries, purple!70] at (4, 4.2) {Both};

% Content areas (placeholder text)
\\node[font=\\scriptsize, text width=1.5cm, align=center] at (1.5, 2.5) {Only in\\\\Topic A};
\\node[font=\\scriptsize, text width=1.5cm, align=center] at (4, 2.5) {Shared\\\\traits};
\\node[font=\\scriptsize, text width=1.5cm, align=center] at (6.5, 2.5) {Only in\\\\Topic B};

% Difference label
\\node[font=\\scriptsize, gray] at (1.5, 0.8) {Differences};
\\node[font=\\scriptsize, gray] at (4, 0.5) {Similarities};
\\node[font=\\scriptsize, gray] at (6.5, 0.8) {Differences};
\\end{tikzpicture}`,
}
