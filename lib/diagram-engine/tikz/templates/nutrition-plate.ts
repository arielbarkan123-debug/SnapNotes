import type { TikzTemplate } from '../index'

export const NUTRITION_PLATE_TEMPLATE: TikzTemplate = {
  id: 'nutrition-plate',
  name: 'Nutrition Plate',
  keywords: [
    'myplate', 'my plate', 'food groups',
    'food pyramid', 'nutrition pyramid',
    'healthy eating', 'balanced diet',
    'fruits vegetables grains protein dairy',
    'food group diagram', 'nutrition diagram',
    'healthy unhealthy foods', 'healthy food chart',
    'healthy foods', 'unhealthy foods',
    'food comparison chart',
  ],
  gradeRange: [1, 5],
  topics: [141, 142, 145],
  category: 'nutrition-plate',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% Title
\\node[font=\\large\\bfseries] at (3, 5.5) {MyPlate: Food Groups};

% Plate (circle divided into 4 sections)
\\fill[red!25] (3, 2.5) -- (3, 4.5) arc (90:180:2) -- cycle; % Fruits (top-left)
\\fill[green!25] (3, 2.5) -- (3, 4.5) arc (90:0:2) -- cycle; % Vegetables (top-right)
\\fill[orange!25] (3, 2.5) -- (1, 2.5) arc (180:270:2) -- cycle; % Grains (bottom-left)
\\fill[purple!20] (3, 2.5) -- (5, 2.5) arc (0:-90:2) -- cycle; % Protein (bottom-right)

% Plate outline
\\draw[very thick] (3, 2.5) circle (2);
\\draw[thick] (1, 2.5) -- (5, 2.5); % horizontal divider
\\draw[thick] (3, 0.5) -- (3, 4.5); % vertical divider

% Section labels
\\node[font=\\footnotesize\\bfseries, red!70] at (2, 3.5) {Fruits};
\\node[font=\\footnotesize\\bfseries, green!60!black] at (4, 3.5) {Vegetables};
\\node[font=\\footnotesize\\bfseries, orange!70] at (2, 1.5) {Grains};
\\node[font=\\footnotesize\\bfseries, purple!70] at (4, 1.5) {Protein};

% Dairy (small circle to the side)
\\fill[blue!20] (6, 3.5) circle (0.6);
\\draw[thick] (6, 3.5) circle (0.6);
\\node[font=\\footnotesize\\bfseries, blue!70] at (6, 3.5) {Dairy};

% Examples below
\\node[font=\\scriptsize, gray, align=center] at (3, -0.5) {Eat a variety from each group every day};
\\end{tikzpicture}`,
}
