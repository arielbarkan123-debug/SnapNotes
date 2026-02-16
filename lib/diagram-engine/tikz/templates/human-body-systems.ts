import type { TikzTemplate } from '../index'

export const HUMAN_BODY_SYSTEMS_TEMPLATE: TikzTemplate = {
  id: 'human-body-systems',
  name: 'Human Body Systems',
  keywords: [
    'human body', 'body system', 'body systems',
    'human body system',
    'skeletal system', 'skeleton', 'bones',
    'muscular system', 'muscles',
    'respiratory system', 'lungs', 'breathing',
    'circulatory system', 'heart blood',
    'digestive system', 'stomach intestine',
    'nervous system', 'brain nerves',
    'organs of the body', 'major organs',
    'human body diagram',
  ],
  gradeRange: [3, 6],
  topics: [91, 92, 93, 94, 95, 96],
  category: 'human-body-systems',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.5,
  organ/.style={draw, thick, rounded corners=3pt, fill=#1, minimum width=1.8cm, minimum height=0.7cm, align=center, font=\\scriptsize\\bfseries},
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (3.5, 9) {Human Digestive System};

% Simplified body outline
\\draw[thick, gray!50] (3.5, 8) ellipse (0.8 and 0.6); % head

% Organs as labeled boxes connected by arrows
\\node[organ=pink!20] (mouth) at (3.5, 7) {Mouth};
\\node[organ=red!15] (esophagus) at (3.5, 6) {Esophagus};
\\node[organ=red!25] (stomach) at (3.5, 4.8) {Stomach};
\\node[organ=yellow!20] (small) at (3.5, 3.5) {Small Intestine};
\\node[organ=orange!20] (large) at (3.5, 2.2) {Large Intestine};

% Accessory organs
\\node[organ=green!20] (liver) at (6.5, 4.8) {Liver};
\\node[organ=blue!15] (pancreas) at (6.5, 3.5) {Pancreas};

% Flow arrows
\\draw[-{Stealth[length=2.5mm]}, thick, red!60] (mouth) -- (esophagus);
\\draw[-{Stealth[length=2.5mm]}, thick, red!60] (esophagus) -- (stomach);
\\draw[-{Stealth[length=2.5mm]}, thick, red!60] (stomach) -- (small);
\\draw[-{Stealth[length=2.5mm]}, thick, red!60] (small) -- (large);

% Accessory connections
\\draw[-{Stealth[length=2mm]}, thick, green!50!black, dashed] (liver) -- (stomach);
\\draw[-{Stealth[length=2mm]}, thick, blue!50, dashed] (pancreas) -- (small);

% Function labels
\\node[right=0.3cm, font=\\scriptsize, gray] at (mouth.east) {Chews food};
\\node[right=0.3cm, font=\\scriptsize, gray] at (esophagus.east) {Moves food down};
\\node[left=0.3cm, font=\\scriptsize, gray] at (stomach.west) {Breaks down food};
\\node[left=0.3cm, font=\\scriptsize, gray] at (small.west) {Absorbs nutrients};
\\node[left=0.3cm, font=\\scriptsize, gray] at (large.west) {Absorbs water};
\\end{tikzpicture}`,
}
