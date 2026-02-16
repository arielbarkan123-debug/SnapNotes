import type { TikzTemplate } from '../index'

export const FORCES_MOTION_ELEMENTARY_TEMPLATE: TikzTemplate = {
  id: 'forces-motion-elementary',
  name: 'Forces and Motion (Elementary)',
  keywords: [
    'push pull force', 'push and pull', 'push pull',
    'forces and motion elementary',
    'friction force elementary', 'gravity force elementary',
    'friction', 'gravity',
    'balanced unbalanced forces',
    'net force elementary', 'force arrows elementary',
    'gravity pulls down', 'what is gravity',
    'gravity pulling', 'weight of objects',
    'motion and forces kids',
    'spring force', 'spring',
  ],
  gradeRange: [2, 5],
  topics: [120, 123],
  category: 'forces-motion-elementary',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Forces: Push and Pull};

% Object (box)
\\fill[blue!15, thick] (3.5, 4) rectangle (6.5, 5.5);
\\draw[very thick] (3.5, 4) rectangle (6.5, 5.5);
\\node[font=\\footnotesize\\bfseries] at (5, 4.75) {Object};

% Push arrow (from left)
\\draw[-{Stealth[length=4mm,width=3mm]}, ultra thick, red!70] (1, 4.75) -- (3.3, 4.75);
\\node[label, red!70, above=0.2cm] at (2, 4.75) {Push};

% Pull arrow (to right)
\\draw[-{Stealth[length=4mm,width=3mm]}, ultra thick, green!60!black] (6.7, 4.75) -- (9, 4.75);
\\node[label, green!60!black, above=0.2cm] at (8, 4.75) {Pull};

% Gravity arrow (down)
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, purple!70] (5, 3.8) -- (5, 2.5);
\\node[label, purple!70, right=0.2cm] at (5, 3) {Gravity};

% Friction arrow (opposing motion)
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, orange!70] (5, 4) -- (3.5, 4);
\\node[label, orange!70, below=0.2cm] at (4.2, 3.8) {Friction};

% Ground
\\draw[very thick, brown!50] (0, 4) -- (10, 4);
\\fill[brown!10] (0, 3.5) rectangle (10, 4);

% Key at bottom
\\node[draw, thick, rounded corners=4pt, fill=yellow!10, font=\\scriptsize, align=left, inner sep=6pt] at (5, 1.5) {
  \\textbf{Key:}\\\\
  \\textcolor{red!70}{Push} = force that moves object away\\\\
  \\textcolor{green!60!black}{Pull} = force that moves object toward\\\\
  \\textcolor{purple!70}{Gravity} = pulls everything down\\\\
  \\textcolor{orange!70}{Friction} = slows things down
};
\\end{tikzpicture}`,
}
