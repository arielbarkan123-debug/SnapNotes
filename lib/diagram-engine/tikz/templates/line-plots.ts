import type { TikzTemplate } from '../index'

export const LINE_PLOTS_TEMPLATE: TikzTemplate = {
  id: 'line-plots',
  name: 'Line Plots',
  keywords: [
    'line plot', 'line-plot', 'x marks',
    'line graph data', 'connected points graph',
    'frequency plot', 'line plot fractions',
    'data line plot',
    'line graph', 'temperature graph', 'temperature over time',
    'growth over time',
  ],
  gradeRange: [2, 5],
  topics: [36, 51, 63],
  category: 'line-plots',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.9]
  % Number line
  \\draw[thick, -{Stealth[length=3mm]}] (-0.5,0) -- (8.5,0);
  \\foreach \\x in {0,...,8} {
    \\draw[thick] (\\x, -0.15) -- (\\x, 0.15);
    \\node[below=4pt, font=\\small] at (\\x, -0.15) {\\x};
  }
  % X marks stacked above values
  % Value 2: 3 marks
  \\foreach \\y in {1,2,3} {
    \\node[font=\\normalsize, blue!70!black] at (2, {0.3+\\y*0.4}) {$\\times$};
  }
  % Value 3: 1 mark
  \\node[font=\\normalsize, blue!70!black] at (3, 0.7) {$\\times$};
  % Value 4: 4 marks
  \\foreach \\y in {1,...,4} {
    \\node[font=\\normalsize, blue!70!black] at (4, {0.3+\\y*0.4}) {$\\times$};
  }
  % Value 5: 2 marks
  \\foreach \\y in {1,2} {
    \\node[font=\\normalsize, blue!70!black] at (5, {0.3+\\y*0.4}) {$\\times$};
  }
  % Value 7: 1 mark
  \\node[font=\\normalsize, blue!70!black] at (7, 0.7) {$\\times$};
  % Title
  \\node[above=0.3cm, font=\\bfseries] at (4, 2.5) {Number of Books Read};
\\end{tikzpicture}`,
}
