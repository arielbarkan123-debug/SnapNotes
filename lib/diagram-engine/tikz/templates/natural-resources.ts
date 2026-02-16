import type { TikzTemplate } from '../index'

export const NATURAL_RESOURCES_TEMPLATE: TikzTemplate = {
  id: 'natural-resources',
  name: 'Natural Resources',
  keywords: [
    'natural resources', 'resources',
    'land water air resources',
    'human resources', 'capital resources',
    'types of resources', 'earth resources',
  ],
  gradeRange: [3, 5],
  topics: [208],
  category: 'natural-resources',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  mainbox/.style={draw, very thick, fill=#1, minimum width=3cm, minimum height=0.9cm, align=center, font=\\footnotesize\\bfseries, rounded corners=5pt},
  subbox/.style={draw, thick, fill=#1, minimum width=2cm, minimum height=0.7cm, align=center, font=\\scriptsize\\bfseries, rounded corners=3pt},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 8.5) {Natural Resources};

% Main box at top
\\node[mainbox=yellow!20] (main) at (5, 7.5) {Natural Resources};
\\node[font=\\scriptsize, text=gray!70!black] at (5, 6.9) {Things from nature that people use};

% Three category boxes
\\node[mainbox=green!25] (land) at (1.5, 5.5) {Land};
\\node[mainbox=blue!25] (water) at (5, 5.5) {Water};
\\node[mainbox=cyan!15] (air) at (8.5, 5.5) {Air};

% Arrows from main to categories
\\draw[arrow=green!50!black] (main.south west) -- (land.north);
\\draw[arrow=blue!60] (main.south) -- (water.north);
\\draw[arrow=cyan!50!black] (main.south east) -- (air.north);

% Land sub-items
\\node[subbox=green!15] (l1) at (1.5, 4.2) {Trees};
\\node[subbox=green!15] (l2) at (1.5, 3.2) {Minerals};
\\node[subbox=green!15] (l3) at (1.5, 2.2) {Soil};
\\draw[arrow=green!50!black] (land.south) -- (l1.north);
\\draw[arrow=green!50!black] (l1.south) -- (l2.north);
\\draw[arrow=green!50!black] (l2.south) -- (l3.north);

% Water sub-items
\\node[subbox=blue!15] (w1) at (5, 4.2) {Rivers};
\\node[subbox=blue!15] (w2) at (5, 3.2) {Lakes};
\\node[subbox=blue!15] (w3) at (5, 2.2) {Oceans};
\\draw[arrow=blue!60] (water.south) -- (w1.north);
\\draw[arrow=blue!60] (w1.south) -- (w2.north);
\\draw[arrow=blue!60] (w2.south) -- (w3.north);

% Air sub-items
\\node[subbox=cyan!10] (a1) at (8.5, 4.2) {Oxygen};
\\node[subbox=cyan!10] (a2) at (8.5, 3.2) {Wind};
\\draw[arrow=cyan!50!black] (air.south) -- (a1.north);
\\draw[arrow=cyan!50!black] (a1.south) -- (a2.north);

% Small decorative icons (simple shapes)
\\fill[green!40] (0.3, 4.2) circle (0.15);
\\draw[thick, brown!60] (0.3, 3.9) -- (0.3, 4.05);
\\fill[blue!30] (6.2, 4.2) -- (6.5, 3.9) -- (6.8, 4.2) -- cycle;
\\draw[thick, decorate, decoration={snake, amplitude=0.5mm, segment length=2mm}, cyan!50] (9.8, 4.2) -- (10.3, 4.2);

% Bottom note
\\node[font=\\scriptsize, text=gray!60!black, align=center] at (5, 1.2) {We must protect natural resources so they last for the future!};
\\end{tikzpicture}`,
}
