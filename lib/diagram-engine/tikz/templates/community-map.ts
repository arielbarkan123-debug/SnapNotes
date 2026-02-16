import type { TikzTemplate } from '../index'

export const COMMUNITY_MAP_TEMPLATE: TikzTemplate = {
  id: 'community-map',
  name: 'Community Map',
  keywords: [
    'community map', 'neighborhood map',
    'map of a community', 'town map',
    'places in a community', 'community places',
    'school library hospital map',
    'my neighborhood', 'local map',
  ],
  gradeRange: [1, 3],
  topics: [128],
  category: 'community-map',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.2,
  building/.style={draw, thick, fill=#1, minimum width=1.8cm, minimum height=1cm, align=center, font=\\scriptsize\\bfseries}
]
% Title
\\node[font=\\large\\bfseries] at (6, 8) {My Community Map};

% Roads (grid)
\\fill[gray!20] (0, 3.5) rectangle (12, 4.5); % horizontal road
\\fill[gray!20] (5.5, 0) rectangle (6.5, 8); % vertical road
\\draw[dashed, yellow!70, thick] (0, 4) -- (12, 4); % center line
\\draw[dashed, yellow!70, thick] (6, 0) -- (6, 8); % center line

% Road labels
\\node[font=\\scriptsize, gray, fill=white, inner sep=1pt] at (3, 4.7) {Main Street};
\\node[font=\\scriptsize, gray, fill=white, inner sep=1pt, rotate=90] at (5.3, 6) {Oak Avenue};

% Buildings
\\node[building=red!20] at (2, 6.5) {School};
\\node[building=blue!20] at (9, 6.5) {Library};
\\node[building=green!20] at (2, 1.5) {Park};
\\node[building=orange!20] at (9, 1.5) {Store};
\\node[building=pink!20] at (9, 4) {Hospital};
\\node[building=yellow!20] at (2, 4) {Fire\\\\Station};

% Trees in park
\\fill[green!40] (1.5, 1) circle (0.15);
\\fill[green!40] (2, 0.8) circle (0.15);
\\fill[green!40] (2.5, 1) circle (0.15);

% Compass rose (small)
\\node[font=\\scriptsize\\bfseries] at (11, 7.5) {N};
\\node[font=\\scriptsize\\bfseries] at (11, 6.5) {S};
\\node[font=\\scriptsize\\bfseries] at (11.5, 7) {E};
\\node[font=\\scriptsize\\bfseries] at (10.5, 7) {W};
\\draw[-{Stealth[length=2mm]}, thick] (11, 6.8) -- (11, 7.3);
\\end{tikzpicture}`,
}
