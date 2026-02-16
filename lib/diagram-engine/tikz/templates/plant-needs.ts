import type { TikzTemplate } from '../index'

export const PLANT_NEEDS_TEMPLATE: TikzTemplate = {
  id: 'plant-needs',
  name: 'What Plants Need',
  keywords: [
    'what plants need', 'plants need water',
    'plants need sunlight', 'plant needs',
    'plant growth requirements', 'plants need air',
    'plants need soil', 'plant survival',
  ],
  gradeRange: [1, 3],
  topics: [201],
  category: 'plant-needs',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing, positioning}
\\begin{tikzpicture}[scale=1.5,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  resource/.style={-{Stealth[length=3.5mm,width=2.5mm]}, very thick, #1, line width=1.5pt}
]
% Title
\\node[font=\\large\\bfseries] at (4, 7.5) {What Do Plants Need to Grow?};

% ===== CENTRAL PLANT =====
% Pot
\\fill[brown!40] (3.2, 1.5) -- (3.5, 0.5) -- (4.5, 0.5) -- (4.8, 1.5) -- cycle;
\\draw[very thick, brown!60] (3.2, 1.5) -- (3.5, 0.5) -- (4.5, 0.5) -- (4.8, 1.5) -- cycle;
\\fill[brown!30] (3.1, 1.5) rectangle (4.9, 1.8);
\\draw[very thick, brown!60] (3.1, 1.5) rectangle (4.9, 1.8);

% Soil in pot
\\fill[brown!25] (3.2, 1.5) -- (3.3, 1.8) -- (4.7, 1.8) -- (4.8, 1.5) -- cycle;

% Stem
\\draw[very thick, green!50!black] (4, 1.8) -- (4, 4.5);

% Leaves (left)
\\fill[green!40] (4, 3.0) .. controls (2.8, 3.5) and (2.8, 2.8) .. (4, 2.8) -- cycle;
\\draw[thick, green!60!black] (4, 3.0) .. controls (2.8, 3.5) and (2.8, 2.8) .. (4, 2.8);
\\draw[thin, green!60!black] (4, 2.9) -- (3.2, 3.0);

% Leaves (right)
\\fill[green!40] (4, 3.5) .. controls (5.2, 4.0) and (5.2, 3.3) .. (4, 3.3) -- cycle;
\\draw[thick, green!60!black] (4, 3.5) .. controls (5.2, 4.0) and (5.2, 3.3) .. (4, 3.3);
\\draw[thin, green!60!black] (4, 3.4) -- (4.8, 3.5);

% Another leaf pair (lower)
\\fill[green!35] (4, 2.3) .. controls (5, 2.7) and (5, 2.1) .. (4, 2.1) -- cycle;
\\draw[thick, green!60!black] (4, 2.3) .. controls (5, 2.7) and (5, 2.1) .. (4, 2.1);

% Flower
\\fill[red!40] (4, 4.5) circle (0.15);
\\fill[pink!50] (3.7, 4.8) circle (0.2);
\\fill[pink!50] (4.3, 4.8) circle (0.2);
\\fill[pink!50] (3.8, 5.1) circle (0.2);
\\fill[pink!50] (4.2, 5.1) circle (0.2);
\\fill[pink!50] (4, 5.25) circle (0.2);
\\fill[yellow!60] (4, 4.9) circle (0.15);

% ===== SUNLIGHT (from top) =====
\\fill[yellow!50] (6.5, 7) circle (0.6);
\\draw[very thick, orange!60] (6.5, 7) circle (0.6);
\\node[font=\\scriptsize\\bfseries] at (6.5, 7) {Sun};
\\draw[resource=yellow!70] (6.1, 6.5) -- (4.5, 5.5);
\\node[label, orange!70] at (7.2, 6.3) {Sunlight};
\\node[font=\\scriptsize, orange!60] at (7.2, 5.9) {(Energy)};

% Sun rays
\\draw[thick, yellow!60] (6.5, 7.7) -- (6.5, 7.9);
\\draw[thick, yellow!60] (7.2, 7) -- (7.4, 7);
\\draw[thick, yellow!60] (7.0, 7.5) -- (7.2, 7.7);
\\draw[thick, yellow!60] (5.8, 7) -- (5.6, 7);
\\draw[thick, yellow!60] (6.0, 7.5) -- (5.8, 7.7);

% ===== WATER (from left) =====
% Cloud
\\fill[gray!20] (0.3, 5) ellipse (0.7 and 0.35);
\\fill[gray!20] (0, 5.2) ellipse (0.4 and 0.25);
\\fill[gray!20] (0.6, 5.2) ellipse (0.45 and 0.25);
\\draw[thick, gray!40] (0.3, 5) ellipse (0.7 and 0.35);

% Rain drops
\\fill[blue!50] (0.1, 4.4) circle (0.06);
\\fill[blue!50] (0.4, 4.5) circle (0.06);
\\fill[blue!50] (0.6, 4.3) circle (0.06);

% Arrow
\\draw[resource=blue!60] (1.2, 4.5) -- (3.0, 3.5);
\\node[label, blue!60] at (0.3, 3.8) {Water};

% ===== AIR / CO2 (from right) =====
% Wavy lines for air
\\draw[thick, cyan!50, decorate, decoration={snake, amplitude=1.5mm, segment length=4mm}] (7.5, 4) -- (7.5, 3.2);
\\draw[thick, cyan!50, decorate, decoration={snake, amplitude=1.5mm, segment length=4mm}] (7.8, 3.8) -- (7.8, 3.0);

% Arrow
\\draw[resource=cyan!60!black] (7, 3.5) -- (5.2, 3.5);
\\node[label, cyan!60!black] at (7.8, 4.5) {Air / CO\\textsubscript{2}};

% ===== SOIL / NUTRIENTS (from bottom) =====
% Ground indication
\\fill[brown!20] (1.5, -0.2) rectangle (6.5, 0.2);
\\draw[thick, brown!40] (1.5, 0.2) -- (6.5, 0.2);

% Small root lines
\\draw[thick, brown!40] (4, 0.2) -- (3.5, -0.1);
\\draw[thick, brown!40] (4, 0.2) -- (4.5, -0.1);
\\draw[thick, brown!40] (4, 0.2) -- (4, -0.1);

% Arrow
\\draw[resource=brown!60] (4, 0.2) -- (4, 0.5);
\\node[label, brown!60] at (4, -0.5) {Soil / Nutrients};

% Bottom summary
\\node[draw, thick, rounded corners=4pt, fill=green!10, font=\\footnotesize, align=center, inner sep=6pt] at (4, -1.3) {
  Plants need \\textbf{sunlight}, \\textbf{water}, \\textbf{air}, and \\textbf{soil} to grow!
};
\\end{tikzpicture}`,
}
