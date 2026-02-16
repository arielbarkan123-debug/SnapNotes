import type { TikzTemplate } from '../index'

export const EROSION_WEATHERING_TEMPLATE: TikzTemplate = {
  id: 'erosion-weathering',
  name: 'Erosion and Weathering',
  keywords: [
    'erosion', 'weathering',
    'erosion and weathering',
    'mechanical weathering', 'chemical weathering',
    'wind erosion', 'water erosion',
    'deposition', 'sediment',
    'how rocks break down', 'wearing away',
  ],
  gradeRange: [3, 6],
  topics: [108],
  category: 'erosion-weathering',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing, positioning}
\\begin{tikzpicture}[scale=1.4,
  box/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=3cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7.5) {Weathering and Erosion};

% Main categories
\\node[box=blue!15] (weathering) at (2.5, 6) {Weathering\\\\(Breaking Down)};
\\node[box=green!15] (erosion) at (7.5, 6) {Erosion\\\\(Moving Away)};

% Weathering types
\\node[box=cyan!15] (mech) at (1, 4) {Mechanical\\\\Weathering};
\\node[box=purple!15] (chem) at (4, 4) {Chemical\\\\Weathering};

\\draw[arrow=blue!50] (weathering) -- (mech);
\\draw[arrow=blue!50] (weathering) -- (chem);

% Erosion agents
\\node[box=yellow!15] (water) at (6, 4) {Water};
\\node[box=orange!15] (wind) at (8, 4) {Wind};
\\node[box=gray!15] (ice) at (10, 4) {Ice};

\\draw[arrow=green!50] (erosion) -- (water);
\\draw[arrow=green!50] (erosion) -- (wind);
\\draw[arrow=green!50] (erosion) -- (ice);

% Examples
\\node[font=\\scriptsize, gray, align=center] at (1, 2.8) {Ice wedging,\\\\Plant roots};
\\node[font=\\scriptsize, gray, align=center] at (4, 2.8) {Acid rain,\\\\Rust};
\\node[font=\\scriptsize, gray, align=center] at (6, 2.8) {Rivers,\\\\Waves};
\\node[font=\\scriptsize, gray, align=center] at (8, 2.8) {Sand\\\\blasting};
\\node[font=\\scriptsize, gray, align=center] at (10, 2.8) {Glaciers};

% Process flow at bottom
\\draw[arrow=red!60] (2.5, 1.5) -- (5, 1.5) node[midway, above, font=\\footnotesize] {leads to};
\\draw[arrow=red!60] (5, 1.5) -- (8.5, 1.5) node[midway, above, font=\\footnotesize] {leads to};

\\node[box=blue!10] at (2.5, 1.5) {Weathering};
\\node[box=green!10] at (5, 1.5) {Erosion};
\\node[box=brown!15] at (8.5, 1.5) {Deposition};
\\end{tikzpicture}`,
}
