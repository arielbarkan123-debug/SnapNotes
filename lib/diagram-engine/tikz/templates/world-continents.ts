import type { TikzTemplate } from '../index'

export const WORLD_CONTINENTS_TEMPLATE: TikzTemplate = {
  id: 'world-continents',
  name: 'World Continents and Oceans',
  keywords: [
    'continents', 'seven continents', 'five oceans',
    'world map', 'continents and oceans',
    'north america south america',
    'europe asia africa',
    'australia antarctica',
    'pacific atlantic indian ocean',
  ],
  gradeRange: [2, 5],
  topics: [203, 204],
  category: 'world-continents',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.3]
% Title
\\node[font=\\large\\bfseries] at (7, 8.5) {World Continents and Oceans};

% Ocean background
\\fill[blue!10] (0, 0) rectangle (14, 8);

% North America (green blob, upper left)
\\fill[green!40, draw=green!50!black, thick, rounded corners=4pt]
  (1.5, 5) -- (2, 6.5) -- (3.5, 7) -- (4.2, 6.2) -- (4, 5) -- (3.2, 4.2) -- (2, 4.5) -- cycle;
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (3, 5.8) {North};
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (3, 5.3) {America};

% South America (green blob, lower left)
\\fill[green!50, draw=green!50!black, thick, rounded corners=4pt]
  (3.2, 1) -- (3, 2) -- (3.5, 3.2) -- (4, 3.5) -- (4.5, 3) -- (4.3, 2) -- (3.8, 0.8) -- cycle;
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (3.8, 2.4) {South};
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (3.8, 1.9) {America};

% Europe (green blob, upper middle)
\\fill[green!35, draw=green!50!black, thick, rounded corners=4pt]
  (6, 6) -- (6.5, 7) -- (7.5, 7.2) -- (8, 6.5) -- (7.5, 5.8) -- (6.5, 5.8) -- cycle;
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (7, 6.5) {Europe};

% Africa (green blob, center)
\\fill[green!45, draw=green!50!black, thick, rounded corners=4pt]
  (6.5, 2) -- (6.2, 3) -- (6.5, 4.5) -- (7.5, 5) -- (8.5, 4.5) -- (8.8, 3) -- (8, 1.8) -- (7, 1.5) -- cycle;
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (7.5, 3.3) {Africa};

% Asia (large green blob, upper right)
\\fill[green!30, draw=green!50!black, thick, rounded corners=4pt]
  (8.2, 5) -- (8.5, 6.5) -- (9.5, 7.5) -- (11, 7.2) -- (12.5, 6.5) -- (12.5, 5) -- (11, 4.5) -- (9.5, 4.5) -- cycle;
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (10.5, 6) {Asia};

% Australia (green blob, lower right)
\\fill[green!40, draw=green!50!black, thick, rounded corners=4pt]
  (11, 2) -- (10.8, 2.8) -- (11.5, 3.3) -- (12.8, 3) -- (13, 2.2) -- (12, 1.5) -- cycle;
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (12, 2.4) {Australia};

% Antarctica (white blob, bottom)
\\fill[white, draw=gray, thick, rounded corners=4pt]
  (4, 0) -- (5, 0.5) -- (7, 0.6) -- (9, 0.5) -- (10, 0) -- (9, -0.2) -- (5, -0.2) -- cycle;
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt, rounded corners=1pt] at (7, 0.2) {Antarctica};

% Ocean labels (blue italic)
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (1.5, 3) {\\textit{Atlantic}};
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (1.5, 2.5) {\\textit{Ocean}};
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (10, 3.8) {\\textit{Indian}};
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (10, 3.3) {\\textit{Ocean}};
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (5.5, 7.5) {\\textit{Arctic Ocean}};
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (13, 5) {\\textit{Pacific}};
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (13, 4.5) {\\textit{Ocean}};
\\node[font=\\scriptsize\\bfseries, text=blue!70, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (7, -0.7) {\\textit{Southern Ocean}};
\\end{tikzpicture}`,
}
