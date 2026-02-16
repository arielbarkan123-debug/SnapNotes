import type { TikzTemplate } from '../index'

export const ANIMAL_CLASSIFICATION_TEMPLATE: TikzTemplate = {
  id: 'animal-classification',
  name: 'Animal Classification',
  keywords: [
    'animal classification', 'classify animals',
    'vertebrate', 'invertebrate',
    'vertebrate invertebrate',
    'mammal bird fish reptile amphibian',
    'animal groups', 'animal kingdom',
    'warm blooded cold blooded',
    'backbone no backbone',
    'animal family tree', 'animal tree',
  ],
  gradeRange: [2, 5],
  topics: [89, 90],
  category: 'animal-classification',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  box/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=2cm, minimum height=0.8cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=2.5mm]}, thick}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Animal Classification};

% Root
\\node[box=blue!20] (animals) at (5, 6) {Animals};

% Level 1: Vertebrate / Invertebrate
\\node[box=green!20] (vert) at (2.5, 4.5) {Vertebrates\\\\(Have Backbone)};
\\node[box=orange!20] (invert) at (7.5, 4.5) {Invertebrates\\\\(No Backbone)};

\\draw[arrow] (animals) -- (vert);
\\draw[arrow] (animals) -- (invert);

% Level 2: Vertebrate classes
\\node[box=green!10] (mammal) at (0, 3) {Mammals};
\\node[box=green!10] (bird) at (1.5, 3) {Birds};
\\node[box=green!10] (fish) at (3, 3) {Fish};
\\node[box=green!10] (reptile) at (4.5, 3) {Reptiles};

\\draw[arrow] (vert) -- (mammal);
\\draw[arrow] (vert) -- (bird);
\\draw[arrow] (vert) -- (fish);
\\draw[arrow] (vert) -- (reptile);

% Invertebrate examples
\\node[box=orange!10] (insect) at (6.5, 3) {Insects};
\\node[box=orange!10] (spider) at (8, 3) {Arachnids};
\\node[box=orange!10] (worm) at (9.5, 3) {Worms};

\\draw[arrow] (invert) -- (insect);
\\draw[arrow] (invert) -- (spider);
\\draw[arrow] (invert) -- (worm);

% Examples row
\\node[font=\\scriptsize, gray] at (0, 2.3) {Dog, Cat, Whale};
\\node[font=\\scriptsize, gray] at (1.5, 2.3) {Eagle, Robin};
\\node[font=\\scriptsize, gray] at (3, 2.3) {Salmon, Shark};
\\node[font=\\scriptsize, gray] at (4.5, 2.3) {Snake, Lizard};
\\node[font=\\scriptsize, gray] at (6.5, 2.3) {Ant, Bee};
\\node[font=\\scriptsize, gray] at (8, 2.3) {Spider, Tick};
\\node[font=\\scriptsize, gray] at (9.5, 2.3) {Earthworm};
\\end{tikzpicture}`,
}
