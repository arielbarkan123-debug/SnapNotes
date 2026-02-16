import type { TikzTemplate } from '../index'

export const LANDFORMS_TEMPLATE: TikzTemplate = {
  id: 'landforms',
  name: 'Landforms',
  keywords: [
    'landform', 'landforms',
    'mountain valley plateau',
    'hill plain mesa',
    'canyon island peninsula',
    'types of landforms', 'land features',
    'geographic features', 'terrain types',
    'landscape features', 'terrain',
  ],
  gradeRange: [2, 5],
  topics: [107],
  category: 'landforms',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (6, 7) {Types of Landforms};

% Mountain
\\fill[brown!30] (1, 1) -- (2, 4) -- (3, 1) -- cycle;
\\draw[thick, brown!50] (1, 1) -- (2, 4) -- (3, 1);
\\fill[white] (1.7, 3.5) -- (2, 4) -- (2.3, 3.5) -- cycle; % snow cap
\\node[label, below] at (2, 0.6) {Mountain};

% Hill
\\fill[green!25] (4, 1) .. controls (4.5, 2.5) and (5.5, 2.5) .. (6, 1);
\\draw[thick, green!40] (4, 1) .. controls (4.5, 2.5) and (5.5, 2.5) .. (6, 1);
\\node[label, below] at (5, 0.6) {Hill};

% Plateau (flat top)
\\fill[brown!25] (7, 1) -- (7, 2.8) -- (7.5, 3) -- (9.5, 3) -- (10, 2.8) -- (10, 1) -- cycle;
\\draw[thick, brown!40] (7, 1) -- (7, 2.8) -- (7.5, 3) -- (9.5, 3) -- (10, 2.8) -- (10, 1);
\\node[label, below] at (8.5, 0.6) {Plateau};

% Valley (between mountains, second row)
\\fill[brown!30] (0.5, -3) -- (1.5, -0.5) -- (2.5, -2) -- (3.5, -0.5) -- (4.5, -3) -- cycle;
\\draw[thick, brown!50] (0.5, -3) -- (1.5, -0.5) -- (2.5, -2) -- (3.5, -0.5) -- (4.5, -3);
\\fill[green!20] (1.5, -2.5) -- (2.5, -2) -- (3.5, -2.5) -- cycle;
\\node[label] at (2.5, -2.5) {Valley};

% Island
\\fill[blue!20] (5.5, -3.2) rectangle (9.5, -1);
\\fill[green!30] (7, -2) ellipse (1.2 and 0.6);
\\fill[yellow!30] (7, -2) ellipse (1 and 0.4);
\\draw[thick, blue!40] (5.5, -3.2) rectangle (9.5, -1);
\\draw[thick, green!50] (7, -2) ellipse (1.2 and 0.6);
\\node[label] at (7, -2) {Island};
\\node[font=\\scriptsize, blue!60] at (8.5, -2.8) {Water};

% Ground line
\\draw[thick, brown!40] (0, 1) -- (11, 1);
\\end{tikzpicture}`,
}
