import type { TikzTemplate } from '../index'

export const TEXT_STRUCTURE_TEMPLATE: TikzTemplate = {
  id: 'text-structure',
  name: 'Text Structure',
  keywords: [
    'text structure', 'compare and contrast text',
    'cause and effect text', 'problem and solution text',
    'sequence text structure', 'description text structure',
    'chronological order', 'signal words',
  ],
  gradeRange: [3, 6],
  topics: [218],
  category: 'text-structure',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.2,
  typebox/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=4cm, minimum height=2.2cm, align=center},
  titlestyle/.style={font=\\footnotesize\\bfseries, #1},
  signalstyle/.style={font=\\scriptsize, gray!70, align=center}
]
% Title
\\node[font=\\large\\bfseries] at (5, 11) {Text Structures};

% --- 1) Sequence (top left) ---
\\node[typebox=blue!10] (seq) at (2.5, 8.5) {};
\\node[titlestyle=blue!70] at (2.5, 9.3) {Sequence};
% Mini numbered boxes with arrows
\\node[draw, thick, fill=blue!25, minimum size=0.45cm, font=\\scriptsize\\bfseries] (s1) at (1.4, 8.3) {1};
\\node[draw, thick, fill=blue!25, minimum size=0.45cm, font=\\scriptsize\\bfseries] (s2) at (2.5, 8.3) {2};
\\node[draw, thick, fill=blue!25, minimum size=0.45cm, font=\\scriptsize\\bfseries] (s3) at (3.6, 8.3) {3};
\\draw[-{Stealth[length=2mm]}, thick, blue!60] (s1) -- (s2);
\\draw[-{Stealth[length=2mm]}, thick, blue!60] (s2) -- (s3);
\\node[signalstyle] at (2.5, 7.5) {first, then, finally};

% --- 2) Compare/Contrast (top right) ---
\\node[typebox=green!10] (comp) at (7.5, 8.5) {};
\\node[titlestyle=green!50!black] at (7.5, 9.3) {Compare/Contrast};
% Mini Venn diagram
\\draw[thick, fill=green!20, fill opacity=0.5] (7.0, 8.3) circle (0.55);
\\draw[thick, fill=green!40, fill opacity=0.5] (8.0, 8.3) circle (0.55);
\\node[font=\\scriptsize] at (6.6, 8.3) {A};
\\node[font=\\scriptsize] at (8.4, 8.3) {B};
\\node[signalstyle] at (7.5, 7.5) {alike, different, both};

% --- 3) Cause/Effect (middle left) ---
\\node[typebox=red!10] (ce) at (2.5, 5.2) {};
\\node[titlestyle=red!70] at (2.5, 6.0) {Cause/Effect};
% Arrow from cause box to effect box
\\node[draw, thick, fill=red!25, minimum width=0.9cm, minimum height=0.5cm, font=\\scriptsize, rounded corners=2pt] (cbox) at (1.7, 5.0) {C};
\\node[draw, thick, fill=red!40, minimum width=0.9cm, minimum height=0.5cm, font=\\scriptsize, rounded corners=2pt] (ebox) at (3.3, 5.0) {E};
\\draw[-{Stealth[length=2mm]}, very thick, red!60] (cbox) -- (ebox);
\\node[signalstyle] at (2.5, 4.2) {because, so, therefore};

% --- 4) Problem/Solution (middle right) ---
\\node[typebox=orange!10] (ps) at (7.5, 5.2) {};
\\node[titlestyle=orange!70] at (7.5, 6.0) {Problem/Solution};
% Question mark -> lightbulb
\\node[font=\\normalsize\\bfseries, orange!70] (qmark) at (6.8, 5.0) {?};
\\node[font=\\normalsize, yellow!70!orange] (bulb) at (8.2, 5.0) {!};
\\draw[-{Stealth[length=2mm]}, very thick, orange!60] (7.1, 5.0) -- (7.9, 5.0);
\\node[signalstyle] at (7.5, 4.2) {problem, solution, solve};

% --- 5) Description (bottom center) ---
\\node[typebox=purple!10] (desc) at (5, 2.0) {};
\\node[titlestyle=purple!70] at (5, 2.8) {Description};
% Central topic with branches
\\node[draw, thick, fill=purple!30, circle, inner sep=2pt, font=\\scriptsize] (topic) at (5, 1.8) {T};
\\draw[thick, purple!50] (topic) -- (4.0, 1.3);
\\draw[thick, purple!50] (topic) -- (5.0, 1.0);
\\draw[thick, purple!50] (topic) -- (6.0, 1.3);
\\node[font=\\scriptsize, purple!50] at (4.0, 1.0) {detail};
\\node[font=\\scriptsize, purple!50] at (5.0, 0.7) {detail};
\\node[font=\\scriptsize, purple!50] at (6.0, 1.0) {detail};
\\end{tikzpicture}`,
}
