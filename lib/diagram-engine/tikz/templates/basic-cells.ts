import type { TikzTemplate } from '../index'

export const BASIC_CELLS_TEMPLATE: TikzTemplate = {
  id: 'basic-cells',
  name: 'Basic Cells',
  keywords: [
    'plant cell', 'animal cell',
    'plant vs animal cell', 'cell diagram',
    'cell parts', 'basic cell',
    'cell wall', 'cell membrane',
    'nucleus cell', 'cytoplasm',
    'chloroplast', 'vacuole',
    'parts of a cell elementary',
    'animal plant cell difference',
    'cell comparison',
  ],
  gradeRange: [4, 6],
  topics: [97],
  category: 'basic-cells',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.5,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (3, 5.5) {Animal Cell (Basic)};

% Cell membrane (outer boundary)
\\draw[very thick, red!60] (3, 2.5) ellipse (2.8 and 2.2);
\\fill[red!5] (3, 2.5) ellipse (2.8 and 2.2);

% Nucleus
\\draw[thick, blue!70] (3, 2.8) circle (0.8);
\\fill[blue!15] (3, 2.8) circle (0.8);
\\node[font=\\scriptsize\\bfseries] at (3, 2.8) {Nucleus};

% Cytoplasm label
\\node[font=\\scriptsize, gray] at (1.5, 1.5) {Cytoplasm};

% Mitochondria (simplified oval shapes)
\\draw[thick, green!50!black] (1.2, 3.2) ellipse (0.35 and 0.18);
\\fill[green!20] (1.2, 3.2) ellipse (0.35 and 0.18);

\\draw[thick, green!50!black] (4.5, 1.8) ellipse (0.35 and 0.18);
\\fill[green!20] (4.5, 1.8) ellipse (0.35 and 0.18);

% Labels with leader lines
\\draw[-{Stealth[length=2mm]}, thick] (6.5, 4) -- (5.2, 3.5);
\\node[label, right] at (6.5, 4) {Cell Membrane};

\\draw[-{Stealth[length=2mm]}, thick] (6.5, 2.8) -- (3.8, 2.8);
\\node[label, right] at (6.5, 2.8) {Nucleus};

\\draw[-{Stealth[length=2mm]}, thick] (-0.5, 3.2) -- (0.85, 3.2);
\\node[label, left] at (-0.5, 3.2) {Mitochondria};

\\draw[-{Stealth[length=2mm]}, thick] (-0.5, 1.5) -- (0.8, 1.8);
\\node[label, left] at (-0.5, 1.5) {Cytoplasm};
\\end{tikzpicture}`,
}
