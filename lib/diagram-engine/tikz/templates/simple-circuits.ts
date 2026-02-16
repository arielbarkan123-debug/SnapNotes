import type { TikzTemplate } from '../index'

export const SIMPLE_CIRCUITS_TEMPLATE: TikzTemplate = {
  id: 'simple-circuits',
  name: 'Simple Circuits (Elementary)',
  keywords: [
    'simple circuit', 'circuit elementary',
    'battery bulb wire', 'light bulb circuit',
    'electrical circuit', 'circuit with battery',
    'open circuit closed circuit',
    'series circuit elementary', 'parallel circuit elementary',
    'electrical circuit kids', 'how circuits work',
    'circuit diagram simple', 'switch circuit',
    'circuit bulb', 'battery wire bulb',
  ],
  gradeRange: [3, 6],
  topics: [122],
  category: 'simple-circuits',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (3.5, 6) {Simple Circuit};

% Battery
\\draw[very thick] (0, 1) -- (0, 4);
% Battery symbol
\\draw[very thick] (-0.4, 3.2) -- (0.4, 3.2); % long line (positive)
\\draw[very thick] (-0.2, 2.8) -- (0.2, 2.8); % short line (negative)
\\node[label, left=0.3cm] at (-0.4, 3) {Battery};
\\node[font=\\scriptsize, red!60, left] at (-0.4, 3.4) {$+$};
\\node[font=\\scriptsize, blue!60, left] at (-0.4, 2.6) {$-$};

% Wires
\\draw[very thick, blue!50] (0, 4) -- (3, 4); % top wire
\\draw[very thick, blue!50] (4, 4) -- (7, 4); % top wire continued
\\draw[very thick, blue!50] (7, 4) -- (7, 1); % right wire
\\draw[very thick, blue!50] (7, 1) -- (0, 1); % bottom wire

% Switch (open gap in top wire)
\\draw[very thick, green!50!black] (3, 4) -- (3.5, 4.6); % switch arm
\\fill[green!50!black] (3, 4) circle (0.08);
\\fill[green!50!black] (4, 4) circle (0.08);
\\node[label, above=0.3cm] at (3.5, 4.3) {Switch};

% Light bulb
\\draw[thick] (7, 3) circle (0.4);
\\draw[thick] (6.75, 2.7) -- (7.25, 3.3);
\\draw[thick] (7.25, 2.7) -- (6.75, 3.3);
\\node[label, right=0.4cm] at (7.4, 3) {Light Bulb};

% Current direction arrows
\\draw[-{Stealth[length=2.5mm]}, thick, red!50] (1.5, 4.2) -- (2.5, 4.2);
\\draw[-{Stealth[length=2.5mm]}, thick, red!50] (7.2, 3.5) -- (7.2, 2.5);
\\draw[-{Stealth[length=2.5mm]}, thick, red!50] (5, 0.8) -- (3, 0.8);
\\node[font=\\scriptsize, red!50, above] at (2, 4.3) {Current flow};
\\end{tikzpicture}`,
}
