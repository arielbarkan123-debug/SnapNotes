import type { TikzTemplate } from '../index'

export const WORD_PARTS_TEMPLATE: TikzTemplate = {
  id: 'word-parts',
  name: 'Word Parts',
  keywords: [
    'prefix suffix', 'root word',
    'word parts', 'prefix', 'suffix',
    'base word', 'un re pre',
    'able ment ful', 'word building',
    'morphology',
  ],
  gradeRange: [2, 5],
  topics: [219],
  category: 'word-parts',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  partbox/.style={draw, very thick, rounded corners=4pt, fill=#1, minimum width=1.8cm, minimum height=1cm, align=center, font=\\footnotesize\\bfseries},
  labelstyle/.style={font=\\scriptsize, #1, align=center},
  smallbox/.style={draw, thick, rounded corners=3pt, fill=#1, minimum width=1.3cm, minimum height=0.6cm, align=center, font=\\scriptsize\\bfseries}
]
% Title
\\node[font=\\large\\bfseries] at (5, 9.5) {Word Parts};

% Main example: "unhappiness"
\\node[font=\\normalsize\\bfseries, gray] at (5, 8.7) {Example: unhappiness};

% Three part boxes
\\node[partbox=red!20] (prefix) at (2, 7.2) {un};
\\node[partbox=blue!20] (root) at (5, 7.2) {happy};
\\node[partbox=green!20] (suffix) at (8, 7.2) {ness};

% Labels above
\\node[labelstyle=red!70] at (2, 8.0) {Prefix};
\\node[labelstyle=blue!70] at (5, 8.0) {Root Word};
\\node[labelstyle=green!50!black] at (8, 8.0) {Suffix};

% Arrows pointing down to descriptions
\\draw[-{Stealth[length=2mm]}, thick, red!60] (2, 6.6) -- (2, 5.8);
\\draw[-{Stealth[length=2mm]}, thick, blue!60] (5, 6.6) -- (5, 5.8);
\\draw[-{Stealth[length=2mm]}, thick, green!50!black] (8, 6.6) -- (8, 5.8);

% Descriptions
\\node[labelstyle=red!60, fill=red!5, draw=red!30, rounded corners=3pt, inner sep=4pt] at (2, 5.3) {Changes\\\\meaning};
\\node[labelstyle=blue!60, fill=blue!5, draw=blue!30, rounded corners=3pt, inner sep=4pt] at (5, 5.3) {Main\\\\meaning};
\\node[labelstyle=green!50!black, fill=green!5, draw=green!30, rounded corners=3pt, inner sep=4pt] at (8, 5.3) {Changes\\\\word type};

% Separator line
\\draw[thick, gray!30] (0.5, 4.2) -- (9.5, 4.2);
\\node[font=\\footnotesize\\bfseries, gray] at (5, 3.7) {More Examples};

% Example 2: re + play
\\node[smallbox=red!15] at (2.2, 2.8) {re};
\\node[font=\\footnotesize] at (3.2, 2.8) {+};
\\node[smallbox=blue!15] at (4.2, 2.8) {play};
\\node[font=\\footnotesize] at (5.2, 2.8) {=};
\\node[font=\\footnotesize\\bfseries] at (6.5, 2.8) {replay};
\\node[font=\\scriptsize, gray] at (8.5, 2.8) {(play again)};

% Example 3: help + ful
\\node[smallbox=blue!15] at (2.2, 1.8) {help};
\\node[font=\\footnotesize] at (3.2, 1.8) {+};
\\node[smallbox=green!15] at (4.2, 1.8) {ful};
\\node[font=\\footnotesize] at (5.2, 1.8) {=};
\\node[font=\\footnotesize\\bfseries] at (6.5, 1.8) {helpful};
\\node[font=\\scriptsize, gray] at (8.5, 1.8) {(full of help)};

% Example 4: pre + view
\\node[smallbox=red!15] at (2.2, 0.8) {pre};
\\node[font=\\footnotesize] at (3.2, 0.8) {+};
\\node[smallbox=blue!15] at (4.2, 0.8) {view};
\\node[font=\\footnotesize] at (5.2, 0.8) {=};
\\node[font=\\footnotesize\\bfseries] at (6.5, 0.8) {preview};
\\node[font=\\scriptsize, gray] at (8.5, 0.8) {(see before)};
\\end{tikzpicture}`,
}
