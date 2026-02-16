import type { TikzTemplate } from '../index'

export const TIMELINES_TEMPLATE: TikzTemplate = {
  id: 'timelines',
  name: 'Timelines',
  keywords: [
    'timeline', 'historical timeline',
    'sequence of events', 'events in order',
    'chronological order', 'history timeline',
    'date line', 'time period',
    'before and after', 'era timeline',
    'important dates', 'years in order',
  ],
  gradeRange: [2, 6],
  topics: [124],
  category: 'timelines',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.2,
  event/.style={draw, thick, rounded corners=3pt, fill=#1, minimum width=2cm, text width=2cm, align=center, font=\\scriptsize, inner sep=4pt}
]
% Title
\\node[font=\\large\\bfseries] at (7, 4) {Historical Timeline};

% Main timeline arrow
\\draw[-{Stealth[length=4mm,width=3mm]}, very thick, gray!60] (0, 2) -- (14, 2);

% Year marks
\\foreach \\x/\\year in {1/1800, 4/1850, 7/1900, 10/1950, 13/2000} {
  \\draw[thick] (\\x, 1.7) -- (\\x, 2.3);
  \\node[below=0.3cm, font=\\footnotesize\\bfseries] at (\\x, 1.7) {\\year};
}

% Events (alternating above and below)
\\node[event=blue!15, above=0.5cm] at (1, 2.3) {Event A\\\\happened};
\\draw[thick, blue!40] (1, 2.3) -- (1, 2.8);

\\node[event=green!15, below=0.5cm] at (4, 1.7) {Event B\\\\occurred};
\\draw[thick, green!40] (4, 1.7) -- (4, 1.2);

\\node[event=orange!15, above=0.5cm] at (7, 2.3) {Event C\\\\took place};
\\draw[thick, orange!40] (7, 2.3) -- (7, 2.8);

\\node[event=red!15, below=0.5cm] at (10, 1.7) {Event D\\\\happened};
\\draw[thick, red!40] (10, 1.7) -- (10, 1.2);

\\node[event=purple!15, above=0.5cm] at (13, 2.3) {Event E\\\\occurred};
\\draw[thick, purple!40] (13, 2.3) -- (13, 2.8);
\\end{tikzpicture}`,
}
