import type { TikzTemplate } from '../index'

export const POLLINATION_PHOTOSYNTHESIS_TEMPLATE: TikzTemplate = {
  id: 'pollination-photosynthesis',
  name: 'Pollination and Photosynthesis',
  keywords: [
    'pollination', 'pollinate', 'bee pollination',
    'pollen', 'photosynthesis', 'photosynthesis diagram',
    'how plants make food', 'sunlight water carbon dioxide',
    'plant energy', 'chlorophyll',
  ],
  gradeRange: [2, 5],
  topics: [184, 185],
  category: 'plant-science',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, calc, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.3,
  inputarrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1},
  outputarrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1},
  lbl/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (4.5, 8.2) {Photosynthesis};
\\node[font=\\scriptsize, gray] at (4.5, 7.7) {How plants make their own food};

% Central leaf shape
\\draw[very thick, fill=green!30, rounded corners=8pt] (3.0, 3.5) -- (4.5, 5.5) -- (6.0, 3.5) -- (4.5, 2.5) -- cycle;
\\node[font=\\footnotesize\\bfseries, green!50!black] at (4.5, 4.2) {Leaf};
\\node[font=\\scriptsize, green!50!black] at (4.5, 3.6) {(Chlorophyll)};

% Sun (top) - Sunlight input
\\node[circle, draw, very thick, fill=yellow!50, minimum size=1.2cm, font=\\footnotesize\\bfseries] (sun) at (4.5, 7.0) {Sun};
\\draw[inputarrow=yellow!70!orange] (sun.south) -- node[lbl, right=0.2cm] {Sunlight\\\\(Energy)} (4.5, 5.6);

% Water input (from below/roots)
\\draw[very thick, brown!60, fill=brown!20, rounded corners=3pt] (4.2, 0.5) rectangle (4.8, 2.4);
\\node[font=\\scriptsize\\bfseries, brown!60] at (4.5, 0.2) {Roots};
\\draw[inputarrow=blue!60] (4.5, 2.4) -- node[lbl, right=0.2cm] {Water\\\\(H$_2$O)} (4.5, 2.5);

% Small root lines
\\draw[thick, brown!60] (4.3, 0.5) -- (3.8, 0.0);
\\draw[thick, brown!60] (4.5, 0.5) -- (4.5, -0.1);
\\draw[thick, brown!60] (4.7, 0.5) -- (5.2, 0.0);

% CO2 input (from left)
\\draw[inputarrow=gray!70] (0.5, 4.0) -- node[lbl, above=0.1cm] {Carbon Dioxide\\\\(CO$_2$)} (2.9, 4.0);
\\node[cloud, draw, thick, fill=gray!15, cloud puffs=8, cloud puff arc=120, minimum width=1.4cm, minimum height=0.8cm, font=\\scriptsize] at (0.5, 4.0) {};

% Oxygen output (to right)
\\draw[outputarrow=green!60] (6.1, 4.0) -- node[lbl, above=0.1cm] {Oxygen\\\\(O$_2$)} (8.5, 4.0);
\\node[cloud, draw, thick, fill=green!10, cloud puffs=8, cloud puff arc=120, minimum width=1.4cm, minimum height=0.8cm, font=\\scriptsize] at (8.5, 4.0) {};

% Glucose/Sugar output (down-right)
\\draw[outputarrow=orange!70] (5.5, 3.0) -- node[lbl, right=0.1cm] {Sugar\\\\(Glucose)} (7.5, 1.5);
\\node[draw, thick, rounded corners=4pt, fill=orange!20, minimum width=1.4cm, minimum height=0.7cm, font=\\scriptsize\\bfseries] at (7.5, 1.5) {Energy!};

% Equation at bottom
\\node[draw, thick, rounded corners=4pt, fill=white, font=\\scriptsize\\bfseries] at (4.5, -0.8) {CO$_2$ + Water + Sunlight $\\rightarrow$ Sugar + O$_2$};
\\end{tikzpicture}`,
}
