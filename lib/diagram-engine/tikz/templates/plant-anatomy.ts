import type { TikzTemplate } from '../index'

export const PLANT_ANATOMY_TEMPLATE: TikzTemplate = {
  id: 'plant-anatomy',
  name: 'Plant Anatomy',
  keywords: [
    'parts of a plant', 'plant parts', 'plant anatomy',
    'parts of a flower', 'flower parts', 'flower anatomy',
    'petal', 'stamen', 'pistil', 'sepal',
    'root stem leaf', 'roots stems leaves',
    'seed structure', 'seed germination', 'germination stages',
    'seed coat', 'embryo', 'cotyledon',
    'photosynthesis plant',
    'flower parts diagram', 'leaf parts',
  ],
  gradeRange: [1, 4],
  topics: [86, 87, 88],
  category: 'plant-anatomy',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.5,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (3, 8) {Parts of a Plant};

% Roots
\\draw[thick, brown!60!black, decorate, decoration={random steps, segment length=3mm, amplitude=1mm}] (3, 0.5) -- (2, -0.5);
\\draw[thick, brown!60!black, decorate, decoration={random steps, segment length=3mm, amplitude=1mm}] (3, 0.5) -- (3.2, -0.7);
\\draw[thick, brown!60!black, decorate, decoration={random steps, segment length=3mm, amplitude=1mm}] (3, 0.5) -- (4, -0.3);

% Stem
\\draw[very thick, green!40!black] (3, 0.5) -- (3, 4.5);

% Leaves
\\fill[green!40] (3, 2.5) .. controls (1.5, 3.5) and (1.5, 2.5) .. (3, 2.5);
\\draw[thick, green!50!black] (3, 2.5) .. controls (1.5, 3.5) and (1.5, 2.5) .. (3, 2.5);
\\draw[thin, green!50!black] (3, 2.5) -- (1.8, 3);

\\fill[green!40] (3, 3.5) .. controls (4.5, 4.5) and (4.5, 3.5) .. (3, 3.5);
\\draw[thick, green!50!black] (3, 3.5) .. controls (4.5, 4.5) and (4.5, 3.5) .. (3, 3.5);
\\draw[thin, green!50!black] (3, 3.5) -- (4.2, 4);

% Flower
\\foreach \\a in {0, 72, 144, 216, 288} {
  \\fill[pink!50, rotate around={\\a:(3,5.5)}] (3, 5.5) ellipse (0.3cm and 0.7cm);
  \\draw[thick, pink!70!black, rotate around={\\a:(3,5.5)}] (3, 5.5) ellipse (0.3cm and 0.7cm);
}
\\fill[yellow!60] (3, 5.5) circle (0.25);
\\draw[thick] (3, 5.5) circle (0.25);

% Ground line
\\draw[thick, brown!50] (0.5, 0.5) -- (5.5, 0.5);
\\fill[brown!15] (0.5, -1) rectangle (5.5, 0.5);

% Labels with leader lines
\\draw[-{Stealth[length=2mm]}, thick] (5.5, 5.5) -- (3.4, 5.5);
\\node[label, right] at (5.5, 5.5) {Flower};

\\draw[-{Stealth[length=2mm]}, thick] (5.5, 4) -- (4.2, 3.8);
\\node[label, right] at (5.5, 4) {Leaf};

\\draw[-{Stealth[length=2mm]}, thick] (5.5, 2) -- (3.2, 2);
\\node[label, right] at (5.5, 2) {Stem};

\\draw[-{Stealth[length=2mm]}, thick] (5.5, -0.2) -- (3.5, -0.2);
\\node[label, right] at (5.5, -0.2) {Roots};
\\end{tikzpicture}`,
}
