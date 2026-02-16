import type { TikzTemplate } from '../index'

export const MAP_GRID_COORDINATES_TEMPLATE: TikzTemplate = {
  id: 'map-grid-coordinates',
  name: 'Map Grid Coordinates',
  keywords: [
    'map grid', 'grid coordinates',
    'map coordinates', 'grid reference',
    'latitude longitude elementary',
    'grid map', 'find on map',
    'coordinate grid map', 'map location',
  ],
  gradeRange: [3, 5],
  topics: [207],
  category: 'map-grid-coordinates',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.2]
% Title
\\node[font=\\large\\bfseries] at (3.5, 8) {Map Grid Coordinates};

% Grid background
\\fill[green!5] (0.5, 0.5) rectangle (6.5, 6.5);

% Grid lines
\\draw[gray!40, thin] (0.5, 1.5) -- (6.5, 1.5);
\\draw[gray!40, thin] (0.5, 2.5) -- (6.5, 2.5);
\\draw[gray!40, thin] (0.5, 3.5) -- (6.5, 3.5);
\\draw[gray!40, thin] (0.5, 4.5) -- (6.5, 4.5);
\\draw[gray!40, thin] (0.5, 5.5) -- (6.5, 5.5);
\\draw[gray!40, thin] (1.5, 0.5) -- (1.5, 6.5);
\\draw[gray!40, thin] (2.5, 0.5) -- (2.5, 6.5);
\\draw[gray!40, thin] (3.5, 0.5) -- (3.5, 6.5);
\\draw[gray!40, thin] (4.5, 0.5) -- (4.5, 6.5);
\\draw[gray!40, thin] (5.5, 0.5) -- (5.5, 6.5);

% Grid border
\\draw[thick] (0.5, 0.5) rectangle (6.5, 6.5);

% Column labels (A-F at top)
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.9cm, minimum height=0.5cm] at (1, 7) {A};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.9cm, minimum height=0.5cm] at (2, 7) {B};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.9cm, minimum height=0.5cm] at (3, 7) {C};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.9cm, minimum height=0.5cm] at (4, 7) {D};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.9cm, minimum height=0.5cm] at (5, 7) {E};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.9cm, minimum height=0.5cm] at (6, 7) {F};

% Row labels (1-6 on left)
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.5cm, minimum height=0.9cm] at (0, 6) {1};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.5cm, minimum height=0.9cm] at (0, 5) {2};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.5cm, minimum height=0.9cm] at (0, 4) {3};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.5cm, minimum height=0.9cm] at (0, 3) {4};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.5cm, minimum height=0.9cm] at (0, 2) {5};
\\node[font=\\footnotesize\\bfseries, fill=blue!20, minimum width=0.5cm, minimum height=0.9cm] at (0, 1) {6};

% Icon: Star at (B,3) => col B=2, row 3=4
\\node[star, star points=5, star point ratio=2.2, fill=yellow!80, draw=orange, thick, minimum size=0.5cm] at (2, 4) {};

% Icon: Tree at (D,5) => col D=4, row 5=2
\\fill[brown!60] (3.9, 1.6) rectangle (4.1, 2);
\\fill[green!50!black] (4, 2.4) circle (0.3);

% Icon: House at (E,2) => col E=5, row 2=5
\\fill[red!40] (4.7, 5) -- (5, 5.4) -- (5.3, 5) -- cycle;
\\fill[orange!30] (4.75, 4.7) rectangle (5.25, 5);

% Icon: Flag at (A,6) => col A=1, row 6=1
\\draw[thick, brown!60] (0.8, 0.7) -- (0.8, 1.3);
\\fill[red!50] (0.8, 1.3) -- (1.2, 1.15) -- (0.8, 1) -- cycle;

% Legend box
\\draw[thick, rounded corners=3pt, fill=white] (0.5, -1.8) rectangle (6.5, -0.3);
\\node[font=\\footnotesize\\bfseries] at (3.5, -0.5) {Legend};
\\draw[thick, gray!50] (0.7, -0.7) -- (6.3, -0.7);

% Legend items
\\node[star, star points=5, star point ratio=2.2, fill=yellow!80, draw=orange, thick, minimum size=0.3cm] at (1.2, -1) {};
\\node[font=\\scriptsize, anchor=west] at (1.6, -1) {Star (B, 3)};

\\fill[brown!60] (3, -1.2) rectangle (3.1, -0.9);
\\fill[green!50!black] (3.05, -0.75) circle (0.15);
\\node[font=\\scriptsize, anchor=west] at (3.4, -1) {Tree (D, 5)};

\\fill[red!40] (1, -1.4) -- (1.2, -1.1) -- (1.4, -1.4) -- cycle;
\\fill[orange!30] (1.05, -1.6) rectangle (1.35, -1.4);
\\node[font=\\scriptsize, anchor=west] at (1.6, -1.45) {House (E, 2)};

\\draw[thick, brown!60] (3, -1.6) -- (3, -1.3);
\\fill[red!50] (3, -1.3) -- (3.3, -1.4) -- (3, -1.5) -- cycle;
\\node[font=\\scriptsize, anchor=west] at (3.4, -1.45) {Flag (A, 6)};
\\end{tikzpicture}`,
}
