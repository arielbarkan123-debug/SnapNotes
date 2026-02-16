import type { TikzTemplate } from '../index'

export const DOUBLE_NUMBER_LINES_TEMPLATE: TikzTemplate = {
  id: 'double-number-lines',
  name: 'Double Number Lines',
  keywords: [
    'double number line', 'proportional relationship',
    'proportion number line', 'equivalent ratio number line',
    'double line diagram', 'ratio number line',
    'unit rate', 'rate problem', 'miles per hour',
    'price per', 'cost per',
  ],
  gradeRange: [6, 6],
  topics: [68],
  category: 'double-number-lines',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.85]
  % Top number line (miles)
  \\node[left=0.3cm, font=\\bfseries] at (0, 1.5) {Miles};
  \\draw[thick, -{Stealth[length=3mm]}] (0,1.5) -- (12,1.5);
  \\foreach \\x/\\label in {0/0, 2.4/3, 4.8/6, 7.2/9, 9.6/12} {
    \\draw[thick] (\\x, 1.3) -- (\\x, 1.7);
    \\node[above=4pt, font=\\normalsize] at (\\x, 1.7) {\\label};
  }
  % Bottom number line (minutes)
  \\node[left=0.3cm, font=\\bfseries] at (0, 0) {Minutes};
  \\draw[thick, -{Stealth[length=3mm]}] (0,0) -- (12,0);
  \\foreach \\x/\\label in {0/0, 2.4/10, 4.8/20, 7.2/30, 9.6/40} {
    \\draw[thick] (\\x, -0.2) -- (\\x, 0.2);
    \\node[below=4pt, font=\\normalsize] at (\\x, -0.2) {\\label};
  }
  % Vertical dashed connectors
  \\foreach \\x in {0, 2.4, 4.8, 7.2, 9.6} {
    \\draw[dashed, gray] (\\x, 0.2) -- (\\x, 1.3);
  }
  % Proportion label
  \\node[below=1.0cm, font=\\large] at (5, 0) {3 miles every 10 minutes};
\\end{tikzpicture}`,
}
