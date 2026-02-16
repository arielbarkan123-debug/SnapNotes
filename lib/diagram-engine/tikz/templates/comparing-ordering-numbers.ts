import type { TikzTemplate } from '../index'

export const COMPARING_ORDERING_NUMBERS_TEMPLATE: TikzTemplate = {
  id: 'comparing-ordering-numbers',
  name: 'Comparing and Ordering Numbers',
  keywords: [
    'greater than less than', 'compare numbers', 'ordering numbers',
    'least to greatest', 'greatest to least', 'greater than sign',
    'less than sign', 'equal to', 'comparing numbers',
    'number order',
  ],
  gradeRange: [1, 3],
  topics: [166, 167],
  category: 'comparing-ordering-numbers',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.0]
  % === TITLE ===
  \\node[font=\\normalsize\\bfseries] at (5,7.0) {Comparing and Ordering Numbers};
  % === SECTION 1: COMPARING TWO NUMBERS ===
  \\node[font=\\footnotesize\\bfseries, anchor=west] at (0,6.0) {Compare:};
  % Left number box
  \\node[draw, very thick, fill=blue!15, minimum size=1.2cm, font=\\Large\\bfseries, rounded corners=3pt] (num47) at (2.5,6.0) {47};
  % Alligator mouth (less than symbol) -- the mouth opens toward the bigger number
  % Draw a large < symbol as two thick lines
  \\draw[very thick, red!70!black] (4.2,6.5) -- (3.5,6.0) -- (4.2,5.5);
  % Alligator eye
  \\fill[black] (4.05,6.35) circle (0.06);
  % "Less than" label
  \\node[font=\\scriptsize\\bfseries, red!70!black, fill=white, inner sep=1pt] at (3.85,5.2) {less than};
  % Right number box
  \\node[draw, very thick, fill=green!15, minimum size=1.2cm, font=\\Large\\bfseries, rounded corners=3pt] (num62) at (5.5,6.0) {62};
  % Explanation
  \\node[font=\\scriptsize\\bfseries, fill=yellow!15, draw=gray, rounded corners=2pt, inner sep=3pt] at (8.0,6.0) {47 $<$ 62};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt] at (8.0,5.4) {The mouth opens};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt] at (8.0,5.1) {toward the bigger number!};
  % === SECTION 2: NUMBER LINE SHOWING BOTH ===
  \\node[font=\\footnotesize\\bfseries, anchor=west] at (0,3.8) {On a Number Line:};
  \\draw[very thick, -{Stealth[length=3mm]}] (0.5,3.0) -- (10.5,3.0);
  % Tick marks: 40, 45, 50, 55, 60, 65, 70
  \\draw[thick] (1.0,2.85) -- (1.0,3.15);
  \\node[below=4pt, font=\\scriptsize] at (1.0,2.85) {40};
  \\draw[thick] (2.5,2.85) -- (2.5,3.15);
  \\node[below=4pt, font=\\scriptsize] at (2.5,2.85) {45};
  \\draw[thick] (4.0,2.85) -- (4.0,3.15);
  \\node[below=4pt, font=\\scriptsize] at (4.0,2.85) {50};
  \\draw[thick] (5.5,2.85) -- (5.5,3.15);
  \\node[below=4pt, font=\\scriptsize] at (5.5,2.85) {55};
  \\draw[thick] (7.0,2.85) -- (7.0,3.15);
  \\node[below=4pt, font=\\scriptsize] at (7.0,2.85) {60};
  \\draw[thick] (8.5,2.85) -- (8.5,3.15);
  \\node[below=4pt, font=\\scriptsize] at (8.5,2.85) {65};
  \\draw[thick] (10.0,2.85) -- (10.0,3.15);
  \\node[below=4pt, font=\\scriptsize] at (10.0,2.85) {70};
  % Plot 47
  \\fill[blue!70] (2.1,3.0) circle (0.15);
  \\node[above=6pt, font=\\scriptsize\\bfseries, blue!70!black, fill=white, inner sep=1pt] at (2.1,3.15) {47};
  % Plot 62
  \\fill[green!60!black] (7.6,3.0) circle (0.15);
  \\node[above=6pt, font=\\scriptsize\\bfseries, green!60!black, fill=white, inner sep=1pt] at (7.6,3.15) {62};
  % Arrow showing 47 is to the left = smaller
  \\node[font=\\scriptsize, fill=white, inner sep=1pt] at (4.8,3.7) {47 is to the LEFT, so 47 $<$ 62};
  % === SECTION 3: ORDERING NUMBERS ===
  \\node[font=\\footnotesize\\bfseries, anchor=west] at (0,1.5) {Order from Least to Greatest:};
  % Original unordered numbers
  \\node[draw, thick, fill=orange!15, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (a) at (1.5,0.5) {23};
  \\node[draw, thick, fill=orange!15, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (b) at (3.0,0.5) {87};
  \\node[draw, thick, fill=orange!15, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (c) at (4.5,0.5) {45};
  \\node[draw, thick, fill=orange!15, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (d) at (6.0,0.5) {12};
  % Arrow down
  \\draw[very thick, -{Stealth[length=3mm]}, purple!70] (3.75,0.0) -- (3.75,-0.5);
  % Ordered numbers
  \\node[draw, thick, fill=green!20, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (o1) at (1.5,-1.0) {12};
  \\node[font=\\footnotesize\\bfseries, red!70!black] at (2.25,-1.0) {$<$};
  \\node[draw, thick, fill=green!20, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (o2) at (3.0,-1.0) {23};
  \\node[font=\\footnotesize\\bfseries, red!70!black] at (3.75,-1.0) {$<$};
  \\node[draw, thick, fill=green!20, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (o3) at (4.5,-1.0) {45};
  \\node[font=\\footnotesize\\bfseries, red!70!black] at (5.25,-1.0) {$<$};
  \\node[draw, thick, fill=green!20, minimum width=1cm, minimum height=0.8cm, font=\\footnotesize\\bfseries, rounded corners=2pt] (o4) at (6.0,-1.0) {87};
  % Labels
  \\node[font=\\scriptsize, gray] at (1.5,-1.6) {Least};
  \\node[font=\\scriptsize, gray] at (6.0,-1.6) {Greatest};
  % Connecting arrows from unordered to ordered
  \\draw[thin, dashed, gray, ->] (d.south) to[bend right=15] (o1.north);
  \\draw[thin, dashed, gray, ->] (a.south) to[bend right=10] (o2.north);
  \\draw[thin, dashed, gray, ->] (c.south) to[bend left=10] (o3.north);
  \\draw[thin, dashed, gray, ->] (b.south) to[bend left=15] (o4.north);
\\end{tikzpicture}`,
}
