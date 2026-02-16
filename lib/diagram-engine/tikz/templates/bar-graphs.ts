import type { TikzTemplate } from '../index'

export const BAR_GRAPHS_TEMPLATE: TikzTemplate = {
  id: 'bar-graphs',
  name: 'Bar Graphs',
  keywords: [
    'bar graph', 'bar chart', 'vertical bar', 'horizontal bar',
    'picture graph', 'pictograph', 'scaled bar graph',
    'multi-step bar', 'favorite color graph', 'survey graph',
    'data bar graph', 'frequency bar',
  ],
  gradeRange: [1, 4],
  topics: [11, 24, 35, 52],
  category: 'bar-graphs',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.8]
  % Y-axis
  \\draw[thick, -{Stealth[length=3mm]}] (0,0) -- (0,7.5);
  \\node[above, font=\\bfseries] at (0, 7.5) {Votes};
  % X-axis
  \\draw[thick, -{Stealth[length=3mm]}] (0,0) -- (9,0);
  % Grid lines
  \\foreach \\y in {1,...,7} {
    \\draw[gray!20] (0,\\y) -- (8.5,\\y);
    \\node[left=4pt, font=\\footnotesize] at (0,\\y) {\\y};
  }
  \\node[left=4pt, font=\\footnotesize] at (0,0) {0};
  % Bars
  \\fill[red!60] (1,0) rectangle (2,5);
  \\draw[thick] (1,0) rectangle (2,5);
  \\node[below=4pt, font=\\small] at (1.5,0) {Red};
  \\fill[blue!60] (3,0) rectangle (4,7);
  \\draw[thick] (3,0) rectangle (4,7);
  \\node[below=4pt, font=\\small] at (3.5,0) {Blue};
  \\fill[green!60] (5,0) rectangle (6,3);
  \\draw[thick] (5,0) rectangle (6,3);
  \\node[below=4pt, font=\\small] at (5.5,0) {Green};
  \\fill[yellow!60] (7,0) rectangle (8,4);
  \\draw[thick] (7,0) rectangle (8,4);
  \\node[below=4pt, font=\\small] at (7.5,0) {Yellow};
  % Title
  \\node[above=0.3cm, font=\\large\\bfseries] at (4.5, 7.5) {Favorite Colors};
\\end{tikzpicture}`,
}
