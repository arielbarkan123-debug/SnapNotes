import type { TikzTemplate } from '../index'

export const PLOT_DIAGRAM_TEMPLATE: TikzTemplate = {
  id: 'plot-diagram',
  name: 'Plot Diagram',
  keywords: [
    'plot diagram', 'story structure',
    'story mountain', 'plot mountain',
    'exposition rising action climax falling action resolution',
    'story arc',
    'narrative structure',
    'plot line', 'story plot',
    'rising action falling action',
    'climax resolution',
  ],
  gradeRange: [2, 6],
  topics: [132, 140],
  category: 'plot-diagram',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (6, 7) {Plot Diagram (Story Mountain)};

% The mountain shape
\\draw[very thick, blue!60] (0, 1) -- (4, 5) -- (8, 5.5) -- (12, 1);
\\fill[blue!10] (0, 1) -- (4, 5) -- (8, 5.5) -- (12, 1) -- cycle;

% Plot points
\\fill[red!60] (0, 1) circle (0.12);
\\fill[red!60] (4, 5) circle (0.12);
\\fill[red!60] (8, 5.5) circle (0.12);
\\fill[red!60] (12, 1) circle (0.12);

% Labels
\\node[label, below] at (0, 0.5) {Exposition};
\\node[font=\\scriptsize, gray] at (0, 0) {(Introduction)};

\\node[label, above left=0.3cm] at (2, 3) {Rising Action};

\\node[label, above=0.4cm] at (8, 5.5) {Climax};
\\node[font=\\scriptsize, gray] at (8, 6.3) {(Turning Point)};

\\node[label, above right=0.3cm] at (10, 3.5) {Falling Action};

\\node[label, below] at (12, 0.5) {Resolution};
\\node[font=\\scriptsize, gray] at (12, 0) {(Conclusion)};

% Arrows showing direction
\\draw[-{Stealth[length=2.5mm]}, thick, gray!50] (1, 2) -- (3, 4);
\\draw[-{Stealth[length=2.5mm]}, thick, gray!50] (9, 4.5) -- (11, 2);

% Base line
\\draw[thick, gray!30] (-0.5, 1) -- (12.5, 1);
\\end{tikzpicture}`,
}
