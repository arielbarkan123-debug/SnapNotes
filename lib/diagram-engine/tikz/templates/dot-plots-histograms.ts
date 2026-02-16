import type { TikzTemplate } from '../index'

export const DOT_PLOTS_HISTOGRAMS_TEMPLATE: TikzTemplate = {
  id: 'dot-plots-histograms',
  name: 'Dot Plots and Histograms',
  keywords: [
    'dot plot', 'histogram', 'frequency distribution',
    'frequency table graph', 'data distribution',
    'statistical distribution', 'frequency histogram',
    'dot plot data',
  ],
  gradeRange: [6, 6],
  topics: [75],
  category: 'dot-plots-histograms',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.7]
  % Histogram: Test scores
  % Y-axis
  \\draw[thick, -{Stealth[length=3mm]}] (0,0) -- (0,7);
  \\node[above, font=\\bfseries\\small] at (0, 7) {Frequency};
  \\foreach \\y in {1,...,6} {
    \\draw[gray!20] (0,\\y) -- (12.5,\\y);
    \\node[left=3pt, font=\\footnotesize] at (0,\\y) {\\y};
  }
  \\node[left=3pt, font=\\footnotesize] at (0,0) {0};
  % X-axis
  \\draw[thick, -{Stealth[length=3mm]}] (0,0) -- (13,0);
  % Bars (no gaps between them -- key for histograms)
  \\fill[blue!40] (0.5,0) rectangle (3,2);
  \\draw[thick] (0.5,0) rectangle (3,2);
  \\node[below=3pt, font=\\footnotesize] at (1.75, 0) {60--69};
  \\fill[blue!40] (3,0) rectangle (5.5,4);
  \\draw[thick] (3,0) rectangle (5.5,4);
  \\node[below=3pt, font=\\footnotesize] at (4.25, 0) {70--79};
  \\fill[blue!40] (5.5,0) rectangle (8,6);
  \\draw[thick] (5.5,0) rectangle (8,6);
  \\node[below=3pt, font=\\footnotesize] at (6.75, 0) {80--89};
  \\fill[blue!40] (8,0) rectangle (10.5,3);
  \\draw[thick] (8,0) rectangle (10.5,3);
  \\node[below=3pt, font=\\footnotesize] at (9.25, 0) {90--99};
  \\fill[blue!40] (10.5,0) rectangle (13,1);
  \\draw[thick] (10.5,0) rectangle (13,1);
  \\node[below=3pt, font=\\footnotesize] at (11.75, 0) {100};
  % Title
  \\node[above=0.3cm, font=\\bfseries] at (6.5, 7) {Test Score Distribution};
\\end{tikzpicture}`,
}
