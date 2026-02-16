import type { TikzTemplate } from '../index'

export const NATURAL_DISASTERS_TEMPLATE: TikzTemplate = {
  id: 'natural-disasters',
  name: 'Natural Disasters',
  keywords: [
    'volcano', 'earthquake', 'tornado',
    'natural disaster', 'volcanic eruption',
    'volcano eruption', 'volcano cross section',
    'earthquake diagram', 'tornado formation',
    'hurricane', 'natural hazard',
    'tectonic plates earthquake',
    'eruption', 'cross section',
  ],
  gradeRange: [3, 6],
  topics: [193, 194, 195],
  category: 'natural-disasters',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing, positioning}
\\begin{tikzpicture}[scale=1.3,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  arrow/.style={-{Stealth[length=2.5mm,width=2mm]}, thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 8.5) {Volcano Cross-Section};

% Ground surface
\\fill[brown!25] (0, 0) rectangle (10, 2);
\\fill[green!20] (0, 2) -- (2, 2) -- (2.2, 2.1) -- (0, 2.1) -- cycle;
\\fill[green!20] (8, 2) -- (10, 2) -- (10, 2.1) -- (7.8, 2.1) -- cycle;

% Mountain shape (outer)
\\fill[brown!40] (2, 2) -- (3.5, 5.5) -- (4.2, 7) -- (4.5, 7.2) -- (5, 7.4) -- (5.5, 7.2) -- (5.8, 7) -- (6.5, 5.5) -- (8, 2) -- cycle;
\\draw[very thick, brown!60] (2, 2) -- (3.5, 5.5) -- (4.2, 7) -- (4.5, 7.2) -- (5, 7.4) -- (5.5, 7.2) -- (5.8, 7) -- (6.5, 5.5) -- (8, 2);

% Crater opening at top
\\fill[red!30] (4.2, 7) -- (4.5, 7.2) -- (5, 7.4) -- (5.5, 7.2) -- (5.8, 7) -- (5.3, 6.8) -- (4.7, 6.8) -- cycle;

% Central vent (tube from chamber to top)
\\fill[red!20] (4.5, 1) -- (4.5, 6.8) -- (5.5, 6.8) -- (5.5, 1) -- cycle;
\\draw[thick, red!40] (4.5, 1) -- (4.5, 6.8);
\\draw[thick, red!40] (5.5, 1) -- (5.5, 6.8);

% Magma chamber (underground)
\\fill[red!50] (3, 0.3) ellipse (2.5 and 1);
\\draw[very thick, red!70] (3, 0.3) ellipse (2.5 and 1);
\\fill[red!60] (3.2, 0.3) ellipse (1.5 and 0.5);

% Lava flowing out top left
\\fill[orange!50] (4.2, 7) .. controls (3.8, 6.5) and (3.2, 6) .. (2.8, 5.2) .. controls (2.6, 4.8) and (2.4, 4.5) .. (2.3, 4.2) -- (2.8, 4.4) .. controls (3, 5) and (3.5, 5.8) .. (3.8, 6.2) .. controls (4, 6.5) and (4.3, 6.8) .. (4.5, 7.2) -- cycle;

% Lava flowing out top right
\\fill[orange!50] (5.8, 7) .. controls (6.2, 6.5) and (6.8, 6) .. (7.2, 5.2) .. controls (7.4, 4.8) and (7.5, 4.5) .. (7.6, 4.2) -- (7.1, 4.4) .. controls (7, 5) and (6.5, 5.8) .. (6.2, 6.2) .. controls (6, 6.5) and (5.7, 6.8) .. (5.5, 7.2) -- cycle;

% Ash cloud at top
\\fill[gray!40] (5, 8) ellipse (1.8 and 0.5);
\\fill[gray!30] (4.2, 8.2) ellipse (1 and 0.4);
\\fill[gray!30] (5.8, 8.2) ellipse (1 and 0.4);
\\fill[gray!25] (5, 8.5) ellipse (0.8 and 0.3);

% Labels with leader lines
% Ash cloud label
\\draw[arrow=gray!70] (8, 8.3) -- (6.3, 8.1);
\\node[label, gray!70] at (8.8, 8.3) {Ash Cloud};

% Crater label
\\draw[arrow=brown!70] (7.5, 7.3) -- (5.9, 7.1);
\\node[label, brown!70] at (8.3, 7.3) {Crater};

% Lava label
\\draw[arrow=orange!70] (1.2, 5) -- (2.5, 4.8);
\\node[label, orange!70] at (0.5, 5) {Lava};

% Vent label
\\draw[arrow=red!50] (7, 5) -- (5.6, 4.5);
\\node[label, red!60] at (7.8, 5) {Vent};

% Magma chamber label
\\draw[arrow=red!70] (7.5, 0.5) -- (5.6, 0.4);
\\node[label, red!70] at (8.8, 0.5) {Magma Chamber};

% Ground line
\\draw[very thick, brown!50] (0, 2) -- (2, 2);
\\draw[very thick, brown!50] (8, 2) -- (10, 2);
\\end{tikzpicture}`,
}
