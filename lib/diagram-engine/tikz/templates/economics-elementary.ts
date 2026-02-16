import type { TikzTemplate } from '../index'

export const ECONOMICS_ELEMENTARY_TEMPLATE: TikzTemplate = {
  id: 'economics-elementary',
  name: 'Economics Elementary',
  keywords: [
    'goods and services', 'needs and wants',
    'supply and demand', 'producers consumers',
    'economics for kids', 'buying selling',
    'scarcity', 'trade', 'barter', 'economic resources',
  ],
  gradeRange: [3, 6],
  topics: [205, 206],
  category: 'economics-elementary',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.3,
  gbox/.style={draw, thick, fill=orange!15, minimum width=2cm, minimum height=0.8cm, align=center, font=\\scriptsize\\bfseries, rounded corners=3pt},
  sbox/.style={draw, thick, fill=blue!15, minimum width=2cm, minimum height=0.8cm, align=center, font=\\scriptsize\\bfseries, rounded corners=3pt}
]
% Title
\\node[font=\\large\\bfseries] at (5, 9) {Goods and Services};

% Goods column (left)
\\node[font=\\footnotesize\\bfseries, fill=orange!30, draw=orange!50, thick, rounded corners=4pt, minimum width=3cm, minimum height=0.7cm] at (2, 7.8) {GOODS};
\\node[font=\\scriptsize, text=gray!70!black, align=center] at (2, 7.2) {Things you can touch};
\\node[gbox] (g1) at (2, 6.3) {Bread};
\\node[gbox] (g2) at (2, 5.3) {Shoes};
\\node[gbox] (g3) at (2, 4.3) {Book};

% Services column (right)
\\node[font=\\footnotesize\\bfseries, fill=blue!30, draw=blue!50, thick, rounded corners=4pt, minimum width=3cm, minimum height=0.7cm] at (8, 7.8) {SERVICES};
\\node[font=\\scriptsize, text=gray!70!black, align=center] at (8, 7.2) {Actions people do for you};
\\node[sbox] (s1) at (8, 6.3) {Haircut};
\\node[sbox] (s2) at (8, 5.3) {Teaching};
\\node[sbox] (s3) at (8, 4.3) {Doctor Visit};

% Divider
\\draw[thick, dashed, gray] (5, 4) -- (5, 8.3);

% VS label
\\node[font=\\footnotesize\\bfseries, fill=white, draw=gray, thick, circle, inner sep=2pt] at (5, 6.3) {vs};

% === Bottom section: Supply and Demand ===
\\draw[thick, gray!50] (0.5, 3.2) -- (9.5, 3.2);
\\node[font=\\footnotesize\\bfseries] at (5, 2.7) {Supply and Demand};

% Supply arrow (left side)
\\node[font=\\scriptsize\\bfseries, fill=green!20, draw=green!50!black, thick, rounded corners=3pt, minimum width=2.5cm, minimum height=0.7cm] at (2.5, 1.8) {More Supply};
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, green!50!black] (4, 1.8) -- (5.5, 1.8);
\\node[font=\\scriptsize\\bfseries, fill=green!10, draw=green!50!black, thick, rounded corners=3pt, minimum width=2.5cm, minimum height=0.7cm] at (7.2, 1.8) {Lower Price};
\\draw[-{Stealth[length=2mm]}, thick, red!60] (7.2, 1.3) -- (7.2, 0.9);

% Demand arrow (bottom)
\\node[font=\\scriptsize\\bfseries, fill=red!20, draw=red!60, thick, rounded corners=3pt, minimum width=2.5cm, minimum height=0.7cm] at (2.5, 0.5) {More Demand};
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, red!60] (4, 0.5) -- (5.5, 0.5);
\\node[font=\\scriptsize\\bfseries, fill=red!10, draw=red!60, thick, rounded corners=3pt, minimum width=2.5cm, minimum height=0.7cm] at (7.2, 0.5) {Higher Price};
\\draw[-{Stealth[length=2mm]}, thick, green!50!black] (7.2, 1) -- (7.2, 1.3);
\\end{tikzpicture}`,
}
