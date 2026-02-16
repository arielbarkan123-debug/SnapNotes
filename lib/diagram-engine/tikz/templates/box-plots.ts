import type { TikzTemplate } from '../index'

export const BOX_PLOTS_TEMPLATE: TikzTemplate = {
  id: 'box-plots',
  name: 'Box Plots',
  keywords: [
    'box plot', 'box-and-whisker', 'box and whisker',
    'quartile', 'median box', 'five number summary',
    'interquartile range', 'iqr',
  ],
  gradeRange: [6, 6],
  topics: [77],
  category: 'box-plots',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.7]
  % Number line
  \\draw[thick, -{Stealth[length=3mm]}] (-0.5, 0) -- (21, 0);
  \\foreach \\x in {0,2,...,20} {
    \\draw[thick] (\\x, -0.2) -- (\\x, 0.2);
    \\node[below=4pt, font=\\footnotesize] at (\\x, -0.2) {\\x};
  }
  % Box plot at y=1.5
  % Whiskers
  \\draw[very thick] (3, 1.5) -- (6, 1.5);
  \\draw[very thick] (14, 1.5) -- (18, 1.5);
  % Min and max caps
  \\draw[very thick] (3, 1.1) -- (3, 1.9);
  \\draw[very thick] (18, 1.1) -- (18, 1.9);
  % Box
  \\draw[very thick, fill=blue!15] (6, 0.8) rectangle (14, 2.2);
  % Median line
  \\draw[very thick, red] (10, 0.8) -- (10, 2.2);
  % Labels
  \\node[above=0.3cm, font=\\footnotesize, fill=white, inner sep=1pt] at (3, 1.9) {Min=3};
  \\node[above=0.3cm, font=\\footnotesize, fill=white, inner sep=1pt] at (6, 2.2) {Q1=6};
  \\node[above=0.3cm, font=\\footnotesize, red, fill=white, inner sep=1pt] at (10, 2.2) {Median=10};
  \\node[above=0.3cm, font=\\footnotesize, fill=white, inner sep=1pt] at (14, 2.2) {Q3=14};
  \\node[above=0.3cm, font=\\footnotesize, fill=white, inner sep=1pt] at (18, 1.9) {Max=18};
\\end{tikzpicture}`,
}
