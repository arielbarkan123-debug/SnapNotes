import type { TikzTemplate } from '../index'

export const ROUNDING_NUMBER_LINE_TEMPLATE: TikzTemplate = {
  id: 'rounding-number-line',
  name: 'Rounding on a Number Line',
  keywords: [
    'rounding', 'round to nearest ten', 'round to nearest hundred',
    'rounding number line', 'round up', 'round down',
    'estimate by rounding', 'nearest ten', 'nearest hundred',
  ],
  gradeRange: [2, 4],
  topics: [165],
  category: 'rounding-number-line',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.0]
  % === TITLE ===
  \\node[font=\\normalsize\\bfseries] at (5,3.5) {Rounding to the Nearest Ten};
  % === NUMBER LINE ===
  \\draw[very thick, -{Stealth[length=3mm]}] (-0.5,0) -- (11.5,0);
  % Tick marks for 20 through 30
  \\draw[very thick] (0,-0.2) -- (0,0.2);
  \\draw[thick] (1,-0.15) -- (1,0.15);
  \\draw[thick] (2,-0.15) -- (2,0.15);
  \\draw[thick] (3,-0.15) -- (3,0.15);
  \\draw[thick] (4,-0.15) -- (4,0.15);
  \\draw[very thick] (5,-0.2) -- (5,0.2);
  \\draw[thick] (6,-0.15) -- (6,0.15);
  \\draw[thick] (7,-0.15) -- (7,0.15);
  \\draw[thick] (8,-0.15) -- (8,0.15);
  \\draw[thick] (9,-0.15) -- (9,0.15);
  \\draw[very thick] (10,-0.2) -- (10,0.2);
  % Number labels below
  \\node[below=5pt, font=\\footnotesize\\bfseries] at (0,0) {20};
  \\node[below=5pt, font=\\scriptsize] at (1,0) {21};
  \\node[below=5pt, font=\\scriptsize] at (2,0) {22};
  \\node[below=5pt, font=\\scriptsize] at (3,0) {23};
  \\node[below=5pt, font=\\scriptsize] at (4,0) {24};
  \\node[below=5pt, font=\\footnotesize\\bfseries] at (5,0) {25};
  \\node[below=5pt, font=\\scriptsize] at (6,0) {26};
  \\node[below=5pt, font=\\scriptsize] at (7,0) {27};
  \\node[below=5pt, font=\\scriptsize] at (8,0) {28};
  \\node[below=5pt, font=\\scriptsize] at (9,0) {29};
  \\node[below=5pt, font=\\footnotesize\\bfseries] at (10,0) {30};
  % Midpoint marker
  \\draw[thick, dashed, gray] (5,-0.5) -- (5,0.5);
  \\node[below=14pt, font=\\scriptsize, gray] at (5,0) {midpoint};
  % === HIGHLIGHTED NUMBER: 27 ===
  \\fill[red!70] (7,0) circle (0.18);
  \\node[above=10pt, font=\\footnotesize\\bfseries, red!70!black, fill=white, inner sep=2pt] at (7,0.2) {27};
  % === CURVED ARROWS showing distance to each ten ===
  % Arrow from 27 to 20 (far away)
  \\draw[thick, orange!70!black, -{Stealth[length=2.5mm]}] (7,0.8) to[bend left=35] node[above, font=\\scriptsize, fill=white, inner sep=1pt] {7 away} (0,0.8);
  % Arrow from 27 to 30 (closer)
  \\draw[thick, green!50!black, -{Stealth[length=2.5mm]}] (7,1.8) to[bend left=35] node[above, font=\\scriptsize, fill=white, inner sep=1pt] {3 away} (10,1.8);
  % === CIRCLE THE ANSWER: 30 ===
  \\draw[very thick, green!50!black] (10,0) circle (0.35);
  \\node[above=8pt, font=\\scriptsize\\bfseries, green!50!black] at (10,0.35) {Closer!};
  % === RESULT LABEL ===
  \\node[font=\\footnotesize\\bfseries, fill=green!15, draw=green!50!black, rounded corners=3pt, inner sep=5pt] at (5,-1.8) {27 rounds to 30 (because 27 is closer to 30 than to 20)};
  % === RULE BOX ===
  \\node[font=\\scriptsize, fill=yellow!15, draw=gray, rounded corners=3pt, inner sep=4pt, text width=8cm, align=center] at (5,-2.8) {\\textbf{Rounding Rule:} If the digit is 5 or more, round UP. If the digit is less than 5, round DOWN.};
\\end{tikzpicture}`,
}
