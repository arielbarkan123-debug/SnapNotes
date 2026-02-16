import type { TikzTemplate } from '../index'

export const FACT_OPINION_TEMPLATE: TikzTemplate = {
  id: 'fact-opinion',
  name: 'Fact vs Opinion',
  keywords: [
    'fact or opinion', 'fact vs opinion',
    'facts and opinions', 'is it a fact',
    'opinion statement', 'prove it fact',
    'fact opinion chart',
  ],
  gradeRange: [2, 5],
  topics: [216],
  category: 'fact-opinion',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  header/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=4.5cm, minimum height=0.9cm, align=center, font=\\footnotesize\\bfseries, text=white},
  factbox/.style={draw, thick, rounded corners=3pt, fill=blue!8, minimum width=4.2cm, minimum height=0.7cm, align=center, font=\\scriptsize},
  opinionbox/.style={draw, thick, rounded corners=3pt, fill=orange!8, minimum width=4.2cm, minimum height=0.7cm, align=center, font=\\scriptsize}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7.5) {Fact vs. Opinion};

% Dividing line
\\draw[very thick, gray!50] (5, 7) -- (5, 0.2);

% Fact header (left)
\\node[header=blue!60] at (2.5, 6.5) {FACT};
\\node[font=\\scriptsize, blue!70, align=center] at (2.5, 5.8) {Can be proven true};

% Opinion header (right)
\\node[header=orange!60] at (7.5, 6.5) {OPINION};
\\node[font=\\scriptsize, orange!70, align=center] at (7.5, 5.8) {What someone thinks or feels};

% Fact examples
\\node[factbox] at (2.5, 4.8) {Water freezes at 0\\textdegree C};
\\node[factbox] at (2.5, 3.6) {Dogs are mammals};
\\node[factbox] at (2.5, 2.4) {The Earth has one moon};

% Opinion examples
\\node[opinionbox] at (7.5, 4.8) {Pizza is delicious};
\\node[opinionbox] at (7.5, 3.6) {Blue is the best color};
\\node[opinionbox] at (7.5, 2.4) {Summer is the best season};

% Check / X markers
\\node[font=\\footnotesize, green!50!black] at (0.2, 4.8) {\\checkmark};
\\node[font=\\footnotesize, green!50!black] at (0.2, 3.6) {\\checkmark};
\\node[font=\\footnotesize, green!50!black] at (0.2, 2.4) {\\checkmark};
\\node[font=\\footnotesize, red!70] at (9.8, 4.8) {?};
\\node[font=\\footnotesize, red!70] at (9.8, 3.6) {?};
\\node[font=\\footnotesize, red!70] at (9.8, 2.4) {?};

% Bottom labels
\\node[font=\\scriptsize, blue!60, align=center] at (2.5, 1.3) {\\bfseries Can be checked\\\\with evidence};
\\node[font=\\scriptsize, orange!60, align=center] at (7.5, 1.3) {\\bfseries Cannot be proven\\\\right or wrong};

% Outer border
\\draw[thick, rounded corners=6pt] (0, 0) rectangle (10, 7);
\\end{tikzpicture}`,
}
