import type { TikzTemplate } from '../index'

export const SOIL_LAYERS_TEMPLATE: TikzTemplate = {
  id: 'soil-layers',
  name: 'Soil Layers',
  keywords: [
    'soil layers', 'soil profile', 'soil horizons',
    'topsoil', 'subsoil', 'bedrock', 'humus',
    'layers of soil', 'soil composition', 'earth soil',
  ],
  gradeRange: [3, 5],
  topics: [187],
  category: 'earth-science',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.3,
  lbl/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (3.5, 8.5) {Soil Layers (Soil Profile)};

% === Surface: Grass and plants ===
% Grass blades
\\draw[very thick, green!60!black] (0.5, 7.0) -- (0.5, 7.6);
\\draw[very thick, green!60!black] (0.7, 7.0) -- (0.6, 7.5);
\\draw[very thick, green!60!black] (1.5, 7.0) -- (1.5, 7.7);
\\draw[very thick, green!60!black] (1.7, 7.0) -- (1.8, 7.5);
\\draw[very thick, green!60!black] (2.5, 7.0) -- (2.4, 7.6);
\\draw[very thick, green!60!black] (3.0, 7.0) -- (3.0, 7.8);
\\draw[very thick, green!60!black] (3.2, 7.0) -- (3.3, 7.5);
\\draw[very thick, green!60!black] (4.0, 7.0) -- (3.9, 7.6);
\\draw[very thick, green!60!black] (4.5, 7.0) -- (4.5, 7.5);
\\draw[very thick, green!60!black] (5.0, 7.0) -- (5.1, 7.7);
\\draw[very thick, green!60!black] (5.5, 7.0) -- (5.4, 7.5);

% Flower
\\draw[very thick, green!60!black] (3.0, 7.0) -- (3.0, 7.8);
\\node[circle, fill=red!40, minimum size=0.25cm] at (3.0, 7.9) {};

% === O Horizon (Humus/organic layer) - thin dark layer ===
\\fill[black!50!brown] (0, 6.5) rectangle (6, 7.0);
\\node[font=\\scriptsize, white] at (3.0, 6.75) {leaves, twigs, humus};

% === A Horizon (Topsoil) ===
\\fill[brown!50!black] (0, 4.5) rectangle (6, 6.5);
% Root lines in topsoil
\\draw[thick, brown!30] (1.5, 6.5) -- (1.3, 5.5);
\\draw[thick, brown!30] (1.3, 5.5) -- (1.0, 5.0);
\\draw[thick, brown!30] (1.3, 5.5) -- (1.6, 4.8);
\\draw[thick, brown!30] (3.0, 6.5) -- (3.2, 5.8);
\\draw[thick, brown!30] (3.2, 5.8) -- (2.9, 5.2);
\\draw[thick, brown!30] (4.5, 6.5) -- (4.3, 5.5);
\\draw[thick, brown!30] (4.3, 5.5) -- (4.6, 4.9);

% === B Horizon (Subsoil) ===
\\fill[orange!40!brown] (0, 2.5) rectangle (6, 4.5);
% Rock fragments in subsoil
\\node[draw, thick, fill=gray!40, rounded corners=2pt, minimum width=0.4cm, minimum height=0.25cm, rotate=15] at (1.5, 3.8) {};
\\node[draw, thick, fill=gray!40, rounded corners=2pt, minimum width=0.3cm, minimum height=0.2cm, rotate=-10] at (3.2, 3.2) {};
\\node[draw, thick, fill=gray!40, rounded corners=2pt, minimum width=0.35cm, minimum height=0.25cm, rotate=20] at (4.8, 3.6) {};
\\node[draw, thick, fill=gray!40, rounded corners=2pt, minimum width=0.3cm, minimum height=0.2cm, rotate=5] at (2.0, 2.9) {};
\\node[draw, thick, fill=gray!40, rounded corners=2pt, minimum width=0.4cm, minimum height=0.25cm, rotate=-15] at (4.2, 2.8) {};

% === C Horizon (Bedrock) ===
\\fill[gray!50] (0, 0.5) rectangle (6, 2.5);
% Crack lines in bedrock
\\draw[thick, gray!70] (1.0, 0.5) -- (1.2, 2.5);
\\draw[thick, gray!70] (2.5, 0.5) -- (2.3, 1.5) -- (2.6, 2.5);
\\draw[thick, gray!70] (4.0, 0.5) -- (4.2, 1.8) -- (3.9, 2.5);
\\draw[thick, gray!70] (5.2, 0.5) -- (5.0, 2.5);

% Border around entire profile
\\draw[very thick] (0, 0.5) rectangle (6, 7.0);

% Horizontal lines between layers
\\draw[thick, dashed] (0, 6.5) -- (6, 6.5);
\\draw[thick, dashed] (0, 4.5) -- (6, 4.5);
\\draw[thick, dashed] (0, 2.5) -- (6, 2.5);

% === Labels on right side with leader lines ===
\\draw[thick, -{Stealth[length=2mm]}] (6.2, 6.75) -- (7.0, 6.75);
\\node[lbl, anchor=west] at (7.1, 6.75) {O Horizon};
\\node[font=\\scriptsize, gray, anchor=west] at (7.1, 6.35) {(Organic/Humus)};

\\draw[thick, -{Stealth[length=2mm]}] (6.2, 5.5) -- (7.0, 5.5);
\\node[lbl, anchor=west] at (7.1, 5.5) {A Horizon};
\\node[font=\\scriptsize, gray, anchor=west] at (7.1, 5.1) {(Topsoil)};

\\draw[thick, -{Stealth[length=2mm]}] (6.2, 3.5) -- (7.0, 3.5);
\\node[lbl, anchor=west] at (7.1, 3.5) {B Horizon};
\\node[font=\\scriptsize, gray, anchor=west] at (7.1, 3.1) {(Subsoil)};

\\draw[thick, -{Stealth[length=2mm]}] (6.2, 1.5) -- (7.0, 1.5);
\\node[lbl, anchor=west] at (7.1, 1.5) {C Horizon};
\\node[font=\\scriptsize, gray, anchor=west] at (7.1, 1.1) {(Bedrock)};
\\end{tikzpicture}`,
}
