import type { TikzTemplate } from '../index'

export const LIFE_CYCLES_TEMPLATE: TikzTemplate = {
  id: 'life-cycles',
  name: 'Life Cycles',
  keywords: [
    'life cycle', 'lifecycle', 'metamorphosis',
    'butterfly life cycle', 'frog life cycle', 'plant life cycle',
    'caterpillar to butterfly', 'tadpole to frog',
    'egg larva pupa adult', 'stages of life',
    'seed to plant', 'germination growth',
    'complete metamorphosis', 'incomplete metamorphosis',
    'chrysalis', 'cocoon', 'tadpole', 'seedling',
  ],
  gradeRange: [1, 4],
  topics: [81, 82, 83],
  category: 'life-cycles',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.5,
  stage/.style={draw, thick, rounded corners=6pt, fill=#1, minimum width=2.2cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (3, 4.2) {Butterfly Life Cycle};

% Stages in a cycle (clockwise from top)
\\node[stage=yellow!20] (egg) at (3, 3) {Egg};
\\node[stage=green!20] (larva) at (6, 1.5) {Larva\\\\(Caterpillar)};
\\node[stage=orange!20] (pupa) at (3, 0) {Pupa\\\\(Chrysalis)};
\\node[stage=blue!20] (adult) at (0, 1.5) {Adult\\\\(Butterfly)};

% Curved arrows connecting stages
\\draw[arrow=red!70] (egg.east) to[bend left=25] (larva.north);
\\draw[arrow=red!70] (larva.south) to[bend left=25] (pupa.east);
\\draw[arrow=red!70] (pupa.west) to[bend left=25] (adult.south);
\\draw[arrow=red!70] (adult.north) to[bend left=25] (egg.west);

% Stage numbers
\\node[circle, fill=red!60, text=white, font=\\footnotesize\\bfseries, inner sep=2pt] at (4.8, 3.1) {1};
\\node[circle, fill=red!60, text=white, font=\\footnotesize\\bfseries, inner sep=2pt] at (5.8, 0.3) {2};
\\node[circle, fill=red!60, text=white, font=\\footnotesize\\bfseries, inner sep=2pt] at (1.2, 0.3) {3};
\\node[circle, fill=red!60, text=white, font=\\footnotesize\\bfseries, inner sep=2pt] at (0.2, 3.1) {4};
\\end{tikzpicture}`,
}
