import type { TikzTemplate } from '../index'

export const PATTERN_SEQUENCES_ELEMENTARY_TEMPLATE: TikzTemplate = {
  id: 'pattern-sequences-elementary',
  name: 'Patterns and Sequences (Elementary)',
  keywords: [
    'growing pattern', 'shape pattern', 'number pattern',
    'what comes next', 'pattern rule', 'repeating pattern',
    'extend the pattern', 'pattern sequence', 'ABAB pattern',
    'pattern blocks',
  ],
  gradeRange: [1, 4],
  topics: [160, 161],
  category: 'pattern-sequences-elementary',
  referenceCode: `\\usetikzlibrary{shapes.geometric}
\\begin{tikzpicture}[scale=1.1]
  % === TITLE ===
  \\node[font=\\normalsize\\bfseries] at (5,4.2) {Shape and Number Patterns};
  % === SHAPE PATTERN ROW ===
  \\node[font=\\footnotesize\\bfseries, anchor=west] at (-0.3,3.2) {Shape Pattern:};
  % Circle 1
  \\draw[very thick, fill=red!30] (1.5,3.2) circle (0.4);
  % Square 1
  \\draw[very thick, fill=blue!30] (2.8,2.8) rectangle (3.6,3.6);
  % Triangle 1
  \\draw[very thick, fill=green!30] (4.5,2.8) -- (4.9,3.6) -- (5.3,2.8) -- cycle;
  % Circle 2
  \\draw[very thick, fill=red!30] (6.2,3.2) circle (0.4);
  % Square 2
  \\draw[very thick, fill=blue!30] (7.1,2.8) rectangle (7.9,3.6);
  % Triangle 2
  \\draw[very thick, fill=green!30] (8.8,2.8) -- (9.2,3.6) -- (9.6,2.8) -- cycle;
  % Question mark for next shape
  \\node[draw, very thick, dashed, minimum size=0.8cm, fill=yellow!15, font=\\large\\bfseries] at (10.9,3.2) {?};
  % Labels below shapes
  \\node[font=\\scriptsize, gray] at (1.5,2.3) {A};
  \\node[font=\\scriptsize, gray] at (3.2,2.3) {B};
  \\node[font=\\scriptsize, gray] at (4.9,2.3) {C};
  \\node[font=\\scriptsize, gray] at (6.2,2.3) {A};
  \\node[font=\\scriptsize, gray] at (7.5,2.3) {B};
  \\node[font=\\scriptsize, gray] at (9.2,2.3) {C};
  \\node[font=\\scriptsize, gray] at (10.9,2.3) {?};
  % Rule annotation
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt, draw=gray, rounded corners=2pt] at (5,1.7) {Rule: Circle, Square, Triangle repeats (ABC pattern)};
  % === NUMBER PATTERN ROW ===
  \\node[font=\\footnotesize\\bfseries, anchor=west] at (-0.3,0.5) {Number Pattern:};
  % Number boxes
  \\node[draw, very thick, fill=blue!15, minimum size=0.9cm, font=\\large\\bfseries] (n1) at (1.8,0.5) {2};
  \\node[draw, very thick, fill=blue!15, minimum size=0.9cm, font=\\large\\bfseries] (n2) at (3.6,0.5) {4};
  \\node[draw, very thick, fill=blue!15, minimum size=0.9cm, font=\\large\\bfseries] (n3) at (5.4,0.5) {6};
  \\node[draw, very thick, fill=blue!15, minimum size=0.9cm, font=\\large\\bfseries] (n4) at (7.2,0.5) {8};
  \\node[draw, very thick, dashed, fill=yellow!15, minimum size=0.9cm, font=\\large\\bfseries] (n5) at (9.0,0.5) {?};
  % +2 arrows between numbers
  \\draw[thick, red!70!black, -{Stealth[length=2.5mm]}] (n1.north) to[bend left=40] node[above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+2} (n2.north);
  \\draw[thick, red!70!black, -{Stealth[length=2.5mm]}] (n2.north) to[bend left=40] node[above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+2} (n3.north);
  \\draw[thick, red!70!black, -{Stealth[length=2.5mm]}] (n3.north) to[bend left=40] node[above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+2} (n4.north);
  \\draw[thick, red!70!black, -{Stealth[length=2.5mm]}] (n4.north) to[bend left=40] node[above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+2} (n5.north);
  % Rule annotation
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt, draw=gray, rounded corners=2pt] at (5,-0.5) {Rule: Add 2 each time (skip counting by 2)};
\\end{tikzpicture}`,
}
