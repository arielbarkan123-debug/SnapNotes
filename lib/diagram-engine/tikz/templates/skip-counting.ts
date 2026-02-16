import type { TikzTemplate } from '../index'

export const SKIP_COUNTING_TEMPLATE: TikzTemplate = {
  id: 'skip-counting',
  name: 'Skip Counting',
  keywords: [
    'skip counting', 'count by twos', 'count by fives', 'count by tens',
    'hundreds chart', 'skip count', 'counting pattern', 'count by threes',
  ],
  gradeRange: [1, 3],
  topics: [168, 169],
  category: 'skip-counting',
  referenceCode: `\\begin{tikzpicture}[scale=1.2]
  % Title
  \\node[font=\\large\\bfseries] at (5, 2.8) {Skip Counting by 5s};
  % Number line
  \\draw[very thick, -latex] (-0.5, 0) -- (10.8, 0);
  % Tick marks and numbers 0 to 20
  \\draw[thick] (0, -0.15) -- (0, 0.15);
  \\node[below=0.2cm, font=\\footnotesize] at (0, -0.15) {0};
  \\draw[thin] (0.5, -0.1) -- (0.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (0.5, -0.1) {1};
  \\draw[thin] (1.0, -0.1) -- (1.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (1.0, -0.1) {2};
  \\draw[thin] (1.5, -0.1) -- (1.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (1.5, -0.1) {3};
  \\draw[thin] (2.0, -0.1) -- (2.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (2.0, -0.1) {4};
  \\draw[thick] (2.5, -0.15) -- (2.5, 0.15);
  \\node[below=0.2cm, font=\\footnotesize] at (2.5, -0.15) {5};
  \\draw[thin] (3.0, -0.1) -- (3.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (3.0, -0.1) {6};
  \\draw[thin] (3.5, -0.1) -- (3.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (3.5, -0.1) {7};
  \\draw[thin] (4.0, -0.1) -- (4.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (4.0, -0.1) {8};
  \\draw[thin] (4.5, -0.1) -- (4.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (4.5, -0.1) {9};
  \\draw[thick] (5.0, -0.15) -- (5.0, 0.15);
  \\node[below=0.2cm, font=\\footnotesize] at (5.0, -0.15) {10};
  \\draw[thin] (5.5, -0.1) -- (5.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (5.5, -0.1) {11};
  \\draw[thin] (6.0, -0.1) -- (6.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (6.0, -0.1) {12};
  \\draw[thin] (6.5, -0.1) -- (6.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (6.5, -0.1) {13};
  \\draw[thin] (7.0, -0.1) -- (7.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (7.0, -0.1) {14};
  \\draw[thick] (7.5, -0.15) -- (7.5, 0.15);
  \\node[below=0.2cm, font=\\footnotesize] at (7.5, -0.15) {15};
  \\draw[thin] (8.0, -0.1) -- (8.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (8.0, -0.1) {16};
  \\draw[thin] (8.5, -0.1) -- (8.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (8.5, -0.1) {17};
  \\draw[thin] (9.0, -0.1) -- (9.0, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (9.0, -0.1) {18};
  \\draw[thin] (9.5, -0.1) -- (9.5, 0.1);
  \\node[below=0.2cm, font=\\scriptsize, gray] at (9.5, -0.1) {19};
  \\draw[thick] (10.0, -0.15) -- (10.0, 0.15);
  \\node[below=0.2cm, font=\\footnotesize] at (10.0, -0.15) {20};
  % Highlighted landing circles
  \\fill[blue!60] (0, 0) circle (0.22);
  \\node[font=\\scriptsize\\bfseries, white] at (0, 0) {0};
  \\fill[blue!60] (2.5, 0) circle (0.22);
  \\node[font=\\scriptsize\\bfseries, white] at (2.5, 0) {5};
  \\fill[blue!60] (5.0, 0) circle (0.22);
  \\node[font=\\scriptsize\\bfseries, white] at (5.0, 0) {10};
  \\fill[blue!60] (7.5, 0) circle (0.22);
  \\node[font=\\scriptsize\\bfseries, white] at (7.5, 0) {15};
  \\fill[blue!60] (10.0, 0) circle (0.22);
  \\node[font=\\scriptsize\\bfseries, white] at (10.0, 0) {20};
  % Jump arcs
  \\draw[very thick, red!70!black, ->, >=latex] (0, 0.3) to[out=60, in=120] node[midway, above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+5} (2.5, 0.3);
  \\draw[very thick, red!70!black, ->, >=latex] (2.5, 0.3) to[out=60, in=120] node[midway, above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+5} (5.0, 0.3);
  \\draw[very thick, red!70!black, ->, >=latex] (5.0, 0.3) to[out=60, in=120] node[midway, above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+5} (7.5, 0.3);
  \\draw[very thick, red!70!black, ->, >=latex] (7.5, 0.3) to[out=60, in=120] node[midway, above, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] {+5} (10.0, 0.3);
\\end{tikzpicture}`,
}
