import type { TikzTemplate } from '../index'

export const CLASSIFICATION_KEY_TEMPLATE: TikzTemplate = {
  id: 'classification-key',
  name: 'Classification / Dichotomous Key',
  keywords: [
    'classification key', 'dichotomous key',
    'sorting key', 'identification key',
    'yes no tree', 'decision tree',
    'classify organisms', 'classify objects',
    'branching key', 'sorting diagram',
    'yes no key', 'sort and identify',
  ],
  gradeRange: [3, 6],
  topics: [155],
  category: 'classification-key',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.2,
  question/.style={draw, thick, diamond, fill=yellow!20, minimum width=2.5cm, minimum height=1.2cm, align=center, font=\\scriptsize\\bfseries, inner sep=2pt},
  result/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=1.8cm, minimum height=0.7cm, align=center, font=\\scriptsize\\bfseries},
  arrow/.style={-{Stealth[length=2.5mm]}, thick}
]
% Title
\\node[font=\\large\\bfseries] at (5, 8) {Dichotomous Key};

% Level 1 question
\\node[question] (q1) at (5, 6.5) {Does it have\\\\legs?};

% Level 2 branches
\\node[question] (q2a) at (2, 4.5) {Does it have\\\\wings?};
\\node[question] (q2b) at (8, 4.5) {Does it live\\\\in water?};

% Results
\\node[result=green!15] (r1) at (0.5, 2.5) {Bird};
\\node[result=blue!15] (r2) at (3.5, 2.5) {Insect};
\\node[result=cyan!15] (r3) at (6.5, 2.5) {Fish};
\\node[result=orange!15] (r4) at (9.5, 2.5) {Worm};

% Arrows with Yes/No labels
\\draw[arrow] (q1.west) -- node[above, font=\\scriptsize] {Yes} (q2a.north east);
\\draw[arrow] (q1.east) -- node[above, font=\\scriptsize] {No} (q2b.north west);

\\draw[arrow] (q2a.south west) -- node[left, font=\\scriptsize] {Yes} (r1.north);
\\draw[arrow] (q2a.south east) -- node[right, font=\\scriptsize] {No} (r2.north);

\\draw[arrow] (q2b.south west) -- node[left, font=\\scriptsize] {Yes} (r3.north);
\\draw[arrow] (q2b.south east) -- node[right, font=\\scriptsize] {No} (r4.north);

% Color coding for Yes/No
\\node[font=\\scriptsize, green!60!black] at (3.2, 5.8) {Yes};
\\node[font=\\scriptsize, red!60] at (6.8, 5.8) {No};
\\end{tikzpicture}`,
}
