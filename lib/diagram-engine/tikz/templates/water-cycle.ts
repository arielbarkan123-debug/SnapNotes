import type { TikzTemplate } from '../index'

export const WATER_CYCLE_TEMPLATE: TikzTemplate = {
  id: 'water-cycle',
  name: 'Water Cycle',
  keywords: [
    'water cycle', 'hydrological cycle',
    'evaporation condensation precipitation',
    'evaporation', 'condensation', 'precipitation',
    'collection runoff', 'water vapor',
    'rain cloud cycle', 'how rain forms',
  ],
  gradeRange: [2, 5],
  topics: [99],
  category: 'water-cycle',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing, positioning}
\\begin{tikzpicture}[scale=1.5,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7.5) {The Water Cycle};

% Sun
\\node[circle, draw, thick, fill=yellow!50, minimum size=1.2cm, font=\\footnotesize\\bfseries] at (0.8, 6.5) {Sun};

% Cloud
\\fill[gray!25] (5, 5.8) ellipse (1.5 and 0.6);
\\fill[gray!25] (4.3, 6.2) ellipse (0.8 and 0.5);
\\fill[gray!25] (5.7, 6.2) ellipse (0.9 and 0.5);
\\draw[thick, gray!50] (5, 5.8) ellipse (1.5 and 0.6);
\\node[font=\\scriptsize\\bfseries] at (5, 5.8) {Cloud};

% Water body (lake/ocean)
\\fill[blue!20] (0, 0) -- (10, 0) -- (10, 1.5) -- (0, 1.5) -- cycle;
\\draw[thick, blue!50] (0, 1.5) -- (10, 1.5);
\\node[font=\\footnotesize, blue!60] at (5, 0.7) {Lake / Ocean};

% Mountains/land
\\fill[brown!20] (7, 1.5) -- (8.5, 3.5) -- (10, 1.5) -- cycle;
\\draw[thick, brown!40] (7, 1.5) -- (8.5, 3.5) -- (10, 1.5);

% EVAPORATION arrow (water to cloud)
\\draw[arrow=red!60, decorate, decoration={snake, amplitude=2mm, segment length=5mm}] (2.5, 1.8) -- (3.8, 5.2);
\\node[label, red!70] at (1.8, 3.5) {Evaporation};

% CONDENSATION label near cloud
\\node[label, purple!70] at (7.5, 6.2) {Condensation};

% PRECIPITATION (rain drops)
\\draw[arrow=blue!60] (4.5, 5.1) -- (3.5, 2.5);
\\draw[arrow=blue!60] (5, 5.1) -- (5, 2.5);
\\draw[arrow=blue!60] (5.5, 5.1) -- (6.5, 2.5);
\\node[label, blue!70] at (3, 3.8) {Precipitation};

% COLLECTION / RUNOFF
\\draw[arrow=cyan!60, thick] (8.5, 2) -- (6, 1.5);
\\node[label, cyan!60!black] at (8.5, 1.2) {Runoff};

% Collection label
\\node[label, blue!50!black] at (2, 0.2) {Collection};
\\end{tikzpicture}`,
}
