import type { TikzTemplate } from '../index'

export const CONCEPT_WEB_TEMPLATE: TikzTemplate = {
  id: 'concept-web',
  name: 'Concept Web / Mind Map',
  keywords: [
    'concept web', 'concept map',
    'mind map', 'web diagram',
    'main idea supporting details',
    'main idea and details', 'supporting details',
    'character map', 'character web',
    'brainstorm web', 'idea web',
    'central idea', 'topic web',
    'brainstorm', 'main topic',
  ],
  gradeRange: [1, 6],
  topics: [133, 138, 139],
  category: 'concept-web',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  main/.style={draw, very thick, circle, fill=yellow!20, minimum size=2.2cm, align=center, font=\\footnotesize\\bfseries},
  detail/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=2cm, minimum height=0.8cm, align=center, font=\\scriptsize},
  arrow/.style={thick, gray!50}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Concept Web};

% Central topic
\\node[main] (center) at (5, 4) {Main\\\\Idea};

% Supporting details (6 around the center)
\\node[detail=blue!15] (d1) at (1, 6) {Detail 1};
\\node[detail=green!15] (d2) at (5, 6.5) {Detail 2};
\\node[detail=orange!15] (d3) at (9, 6) {Detail 3};
\\node[detail=red!15] (d4) at (1, 2) {Detail 4};
\\node[detail=purple!15] (d5) at (5, 1) {Detail 5};
\\node[detail=cyan!15] (d6) at (9, 2) {Detail 6};

% Lines connecting details to center
\\draw[arrow] (center) -- (d1);
\\draw[arrow] (center) -- (d2);
\\draw[arrow] (center) -- (d3);
\\draw[arrow] (center) -- (d4);
\\draw[arrow] (center) -- (d5);
\\draw[arrow] (center) -- (d6);

% Sub-details (examples of deeper connections)
\\node[detail=blue!8, font=\\tiny] (sd1) at (-0.5, 7) {Sub-detail};
\\draw[thin, gray!30] (d1) -- (sd1);

\\node[detail=orange!8, font=\\tiny] (sd2) at (10.5, 7) {Sub-detail};
\\draw[thin, gray!30] (d3) -- (sd2);
\\end{tikzpicture}`,
}
