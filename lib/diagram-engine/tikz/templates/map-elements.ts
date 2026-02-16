import type { TikzTemplate } from '../index'

export const MAP_ELEMENTS_TEMPLATE: TikzTemplate = {
  id: 'map-elements',
  name: 'Map Elements',
  keywords: [
    'compass rose', 'cardinal directions',
    'north south east west',
    'map key', 'map legend',
    'map scale', 'map symbols',
    'latitude longitude', 'latitude and longitude',
    'grid coordinates map', 'map reading',
  ],
  gradeRange: [2, 5],
  topics: [125, 126, 130],
  category: 'map-elements',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% Title
\\node[font=\\large\\bfseries] at (3, 5.5) {Compass Rose};

% Outer circle
\\draw[thick, gray!30] (3, 2.5) circle (2.2);

% Cardinal direction points
% North
\\fill[red!60] (3, 2.5) -- (2.7, 3.5) -- (3, 4.7) -- (3.3, 3.5) -- cycle;
\\node[font=\\large\\bfseries, red!70] at (3, 5.1) {N};

% South
\\fill[blue!40] (3, 2.5) -- (2.7, 1.5) -- (3, 0.3) -- (3.3, 1.5) -- cycle;
\\node[font=\\large\\bfseries, blue!60] at (3, -0.1) {S};

% East
\\fill[green!40] (3, 2.5) -- (4, 2.2) -- (5.2, 2.5) -- (4, 2.8) -- cycle;
\\node[font=\\large\\bfseries, green!60!black] at (5.5, 2.5) {E};

% West
\\fill[orange!40] (3, 2.5) -- (2, 2.2) -- (0.8, 2.5) -- (2, 2.8) -- cycle;
\\node[font=\\large\\bfseries, orange!70] at (0.4, 2.5) {W};

% Intermediate directions
\\node[font=\\footnotesize\\bfseries, gray] at (4.6, 4.2) {NE};
\\node[font=\\footnotesize\\bfseries, gray] at (1.4, 4.2) {NW};
\\node[font=\\footnotesize\\bfseries, gray] at (4.6, 0.8) {SE};
\\node[font=\\footnotesize\\bfseries, gray] at (1.4, 0.8) {SW};

% Center dot
\\fill[black] (3, 2.5) circle (0.08);
\\end{tikzpicture}`,
}
