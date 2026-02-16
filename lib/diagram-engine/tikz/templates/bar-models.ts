import type { TikzTemplate } from '../index'

export const BAR_MODELS_TEMPLATE: TikzTemplate = {
  id: 'bar-models',
  name: 'Bar Models',
  keywords: [
    'bar model', 'strip diagram', 'strip model',
    'bar diagram', 'part whole bar', 'comparison bar',
    'conversion bar',
    'pattern bar', 'sequence bar',
    'sequence rule', 'arithmetic sequence',
  ],
  gradeRange: [3, 6],
  topics: [65, 66, 67],
  category: 'bar-models',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Total bar with segments
  \\draw[thick, fill=blue!15] (0,0) rectangle (4,1);
  \\draw[thick, fill=green!15] (4,0) rectangle (7,1);
  \\draw[thick, fill=orange!15] (7,0) rectangle (10,1);
  % Segment labels
  \\node at (2, 0.5) {\\textbf{40}};
  \\node at (5.5, 0.5) {\\textbf{30}};
  \\node at (8.5, 0.5) {\\textbf{30}};
  % Total bracket above
  \\draw[thick, decorate, decoration={brace, amplitude=8pt}] (0,1.2) -- (10,1.2);
  \\node[above=10pt] at (5, 1.2) {\\textbf{Total = 100}};
\\end{tikzpicture}`,
}
