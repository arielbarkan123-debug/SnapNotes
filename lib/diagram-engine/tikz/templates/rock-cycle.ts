import type { TikzTemplate } from '../index'

export const ROCK_CYCLE_TEMPLATE: TikzTemplate = {
  id: 'rock-cycle',
  name: 'Rock Cycle',
  keywords: [
    'rock cycle', 'types of rocks',
    'igneous sedimentary metamorphic',
    'igneous rock', 'sedimentary rock', 'metamorphic rock',
    'weathering erosion deposition',
    'magma lava rock', 'rock formation',
    'how rocks form', 'rock types',
  ],
  gradeRange: [3, 6],
  topics: [100],
  category: 'rock-cycle',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.5,
  rock/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=2.8cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  process/.style={font=\\scriptsize, fill=white, inner sep=2pt, align=center},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (4, 7) {The Rock Cycle};

% Three rock types in a triangle
\\node[rock=red!20] (igneous) at (4, 5.5) {Igneous\\\\Rock};
\\node[rock=yellow!25] (sedimentary) at (1, 2) {Sedimentary\\\\Rock};
\\node[rock=purple!20] (metamorphic) at (7, 2) {Metamorphic\\\\Rock};

% Magma at bottom center
\\node[rock=orange!30] (magma) at (4, 0) {Magma};

% Arrows with process labels
% Igneous -> Sedimentary (weathering)
\\draw[arrow=blue!60] (igneous.south west) -- (sedimentary.north east);
\\node[process, blue!70] at (1.8, 4.2) {Weathering,\\\\Erosion};

% Sedimentary -> Metamorphic (heat & pressure)
\\draw[arrow=red!50] (sedimentary.east) -- (metamorphic.west);
\\node[process, red!60] at (4, 1.5) {Heat \\&\\\\Pressure};

% Metamorphic -> Magma (melting)
\\draw[arrow=orange!70] (metamorphic.south) -- (magma.east);
\\node[process, orange!70] at (6.2, 0.7) {Melting};

% Magma -> Igneous (cooling)
\\draw[arrow=cyan!60] (magma.north west) to[bend left=20] (igneous.south);
\\node[process, cyan!70] at (2.5, 3) {Cooling};

% Sedimentary -> Magma (melting)
\\draw[arrow=orange!50] (sedimentary.south) -- (magma.west);
\\node[process, orange!50] at (1.8, 0.7) {Melting};

% Igneous -> Metamorphic (heat & pressure)
\\draw[arrow=purple!50] (igneous.south east) -- (metamorphic.north west);
\\node[process, purple!60] at (6.2, 4.2) {Heat \\&\\\\Pressure};
\\end{tikzpicture}`,
}
