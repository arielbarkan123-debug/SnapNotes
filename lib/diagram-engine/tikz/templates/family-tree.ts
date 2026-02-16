import type { TikzTemplate } from '../index'

export const FAMILY_TREE_TEMPLATE: TikzTemplate = {
  id: 'family-tree',
  name: 'Family Tree',
  keywords: [
    'family tree', 'genealogy',
    'family diagram', 'family chart',
    'ancestors descendants',
    'grandparents parents children',
    'generation chart', 'family members',
  ],
  gradeRange: [1, 4],
  topics: [129],
  category: 'family-tree',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  person/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=2cm, minimum height=0.8cm, align=center, font=\\scriptsize\\bfseries},
  arrow/.style={-{Stealth[length=2mm]}, thick, gray!60}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7.5) {Family Tree};

% Grandparents (top row)
\\node[person=purple!15] (gf) at (2, 6) {Grandfather};
\\node[person=purple!15] (gm) at (5, 6) {Grandmother};
\\node[person=blue!15] (gf2) at (8, 6) {Grandfather};
\\node[person=blue!15] (gm2) at (11, 6) {Grandmother};

% Marriage lines
\\draw[thick, red!40] (gf.east) -- (gm.west);
\\draw[thick, red!40] (gf2.east) -- (gm2.west);

% Parents (middle row)
\\node[person=green!15] (dad) at (3.5, 4) {Father};
\\node[person=green!15] (mom) at (9.5, 4) {Mother};

% Lines from grandparents to parents
\\draw[arrow] (3.5, 5.6) -- (dad.north);
\\draw[arrow] (9.5, 5.6) -- (mom.north);

% Marriage line
\\draw[thick, red!40] (dad.east) -- (mom.west);

% Children (bottom row)
\\node[person=orange!15] (c1) at (4, 2) {Child 1};
\\node[person=orange!15] (c2) at (6.5, 2) {Child 2};
\\node[person=orange!15] (c3) at (9, 2) {Child 3};

% Lines from parents to children
\\draw[arrow] (6.5, 3.6) -- (c1.north);
\\draw[arrow] (6.5, 3.6) -- (c2.north);
\\draw[arrow] (6.5, 3.6) -- (c3.north);

% Generation labels
\\node[font=\\scriptsize, gray, left] at (0.5, 6) {Generation 1};
\\node[font=\\scriptsize, gray, left] at (0.5, 4) {Generation 2};
\\node[font=\\scriptsize, gray, left] at (0.5, 2) {Generation 3};
\\end{tikzpicture}`,
}
