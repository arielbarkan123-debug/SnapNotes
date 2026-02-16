import type { TikzTemplate } from '../index'

export const HIBERNATION_MIGRATION_TEMPLATE: TikzTemplate = {
  id: 'hibernation-migration',
  name: 'Hibernation and Migration',
  keywords: [
    'hibernation', 'migration', 'animals in winter',
    'hibernate', 'migrate', 'winter survival',
    'bird migration', 'bear hibernation', 'dormancy',
  ],
  gradeRange: [2, 4],
  topics: [182, 183],
  category: 'animal-adaptations',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.2,
  phase/.style={draw, thick, rounded corners=5pt, fill=#1, minimum width=2.2cm, minimum height=0.9cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=2.5mm,width=2mm]}, very thick, #1},
  seclabel/.style={font=\\scriptsize, gray, align=center}
]
% Main title
\\node[font=\\large\\bfseries] at (5, 8.5) {Hibernation vs. Migration};

% === LEFT SIDE: Hibernation ===
\\node[draw, very thick, rounded corners=6pt, fill=blue!15, minimum width=4cm, minimum height=1cm, font=\\footnotesize\\bfseries] (htitle) at (2.2, 7.7) {Hibernation};
\\node[seclabel] at (2.2, 7.1) {Staying and sleeping};

% Timeline phases
\\node[phase=orange!20] (fall) at (2.2, 6.0) {Fall};
\\node[seclabel, below=0.15cm of fall] {Eat a lot,\\\\store body fat};

\\node[phase=blue!20] (winter) at (2.2, 4.0) {Winter};
\\node[seclabel, below=0.15cm of winter] {Deep sleep,\\\\low heart rate};

\\node[phase=green!20] (spring) at (2.2, 2.0) {Spring};
\\node[seclabel, below=0.15cm of spring] {Wake up,\\\\find food};

% Arrows between hibernation phases
\\draw[arrow=blue!60] (fall.south) -- (winter.north);
\\draw[arrow=blue!60] (winter.south) -- (spring.north);

% Bear icon placeholder
\\node[circle, draw, thick, fill=brown!20, minimum size=0.7cm, font=\\scriptsize\\bfseries] at (0.3, 4.0) {Zz};

% === RIGHT SIDE: Migration ===
\\node[draw, very thick, rounded corners=6pt, fill=green!15, minimum width=4cm, minimum height=1cm, font=\\footnotesize\\bfseries] (mtitle) at (7.8, 7.7) {Migration};
\\node[seclabel] at (7.8, 7.1) {Traveling to warmer places};

% Simple map representation
\\draw[thick, fill=green!8, rounded corners=3pt] (6.0, 1.5) rectangle (9.6, 6.2);

% North region
\\node[draw, thick, rounded corners=4pt, fill=blue!15, minimum width=2.4cm, minimum height=0.8cm, font=\\scriptsize\\bfseries] (north) at (7.8, 5.5) {North (Summer)};

% South region
\\node[draw, thick, rounded corners=4pt, fill=orange!20, minimum width=2.4cm, minimum height=0.8cm, font=\\scriptsize\\bfseries] (south) at (7.8, 2.2) {South (Winter)};

% Fall arrow: North to South
\\draw[arrow=red!60, decorate, decoration={snake, amplitude=1.5mm, segment length=6mm}] (north.south west) -- node[left, font=\\scriptsize\\bfseries, fill=white, inner sep=2pt] {Fall} (south.north west);

% Spring arrow: South to North
\\draw[arrow=green!60, decorate, decoration={snake, amplitude=1.5mm, segment length=6mm}] (south.north east) -- node[right, font=\\scriptsize\\bfseries, fill=white, inner sep=2pt] {Spring} (north.south east);

% Bird icon placeholder
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt] at (7.8, 3.85) {Birds fly};

% Dividing line
\\draw[thick, dashed, gray!40] (4.8, 0.8) -- (4.8, 8.0);

% Examples at bottom
\\node[font=\\scriptsize\\bfseries, blue!60] at (2.2, 0.8) {Bears, Chipmunks, Bats};
\\node[font=\\scriptsize\\bfseries, green!50!black] at (7.8, 0.8) {Geese, Whales, Monarch Butterflies};
\\end{tikzpicture}`,
}
