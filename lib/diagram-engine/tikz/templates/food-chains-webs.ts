import type { TikzTemplate } from '../index'

export const FOOD_CHAINS_WEBS_TEMPLATE: TikzTemplate = {
  id: 'food-chains-webs',
  name: 'Food Chains and Food Webs',
  keywords: [
    'food chain', 'food web', 'predator prey',
    'producer consumer decomposer',
    'herbivore carnivore omnivore',
    'energy flow', 'trophic level',
    'primary consumer', 'secondary consumer',
    'top predator', 'apex predator',
    'who eats what', 'eating chain',
  ],
  gradeRange: [2, 5],
  topics: [84, 85],
  category: 'food-chains',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.5,
  organism/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=2.4cm, minimum height=1cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, green!50!black}
]
% Title
\\node[font=\\large\\bfseries] at (4, 5.5) {Food Chain};

% Energy flow label
\\node[font=\\footnotesize, gray] at (4, 4.8) {Energy flows from left to right};

% Producer
\\node[organism=green!25] (producer) at (0, 3) {Grass\\\\(Producer)};

% Primary consumer
\\node[organism=yellow!25] (primary) at (3, 3) {Rabbit\\\\(Primary\\\\Consumer)};

% Secondary consumer
\\node[organism=orange!25] (secondary) at (6, 3) {Snake\\\\(Secondary\\\\Consumer)};

% Tertiary consumer
\\node[organism=red!20] (tertiary) at (9, 3) {Hawk\\\\(Tertiary\\\\Consumer)};

% Arrows showing energy flow
\\draw[arrow] (producer) -- (primary);
\\draw[arrow] (primary) -- (secondary);
\\draw[arrow] (secondary) -- (tertiary);

% Trophic level labels
\\node[below=0.5cm, font=\\footnotesize, blue!70] at (producer.south) {Trophic Level 1};
\\node[below=0.5cm, font=\\footnotesize, blue!70] at (primary.south) {Trophic Level 2};
\\node[below=0.5cm, font=\\footnotesize, blue!70] at (secondary.south) {Trophic Level 3};
\\node[below=0.5cm, font=\\footnotesize, blue!70] at (tertiary.south) {Trophic Level 4};

% Sun (energy source)
\\node[circle, draw, thick, fill=yellow!50, minimum size=1cm, font=\\footnotesize\\bfseries] (sun) at (-2.5, 3) {Sun};
\\draw[arrow, yellow!70!red] (sun) -- (producer);
\\end{tikzpicture}`,
}
