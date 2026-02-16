import type { TikzTemplate } from '../index'

export const HABITATS_ECOSYSTEMS_TEMPLATE: TikzTemplate = {
  id: 'habitats-ecosystems',
  name: 'Habitats and Ecosystems',
  keywords: [
    'habitat', 'ecosystem',
    'habitats and ecosystems',
    'desert habitat', 'ocean habitat', 'forest habitat',
    'arctic habitat', 'rainforest habitat',
    'living nonliving', 'living and nonliving',
    'biome', 'environment',
    'where animals live', 'animal homes',
  ],
  gradeRange: [2, 5],
  topics: [98],
  category: 'habitats-ecosystems',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  habitat/.style={draw, thick, rounded corners=6pt, fill=#1, minimum width=2.8cm, minimum height=1.6cm, align=center, font=\\footnotesize\\bfseries},
  detail/.style={font=\\scriptsize, gray, align=center}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Types of Habitats};

% Central ecosystem concept
\\node[draw, very thick, circle, fill=green!15, minimum size=2cm, font=\\footnotesize\\bfseries, align=center] (eco) at (5, 4.5) {Habitats};

% Surrounding habitats
\\node[habitat=blue!15] (ocean) at (1, 6) {Ocean\\\\(Marine)};
\\node[habitat=green!20] (forest) at (5, 6.8) {Forest};
\\node[habitat=yellow!20] (desert) at (9, 6) {Desert};
\\node[habitat=cyan!15] (arctic) at (1, 2.5) {Arctic\\\\(Polar)};
\\node[habitat=green!30] (rain) at (5, 1.5) {Rainforest};
\\node[habitat=yellow!10] (grass) at (9, 2.5) {Grassland};

% Connections
\\draw[thick, gray!50] (eco) -- (ocean);
\\draw[thick, gray!50] (eco) -- (forest);
\\draw[thick, gray!50] (eco) -- (desert);
\\draw[thick, gray!50] (eco) -- (arctic);
\\draw[thick, gray!50] (eco) -- (rain);
\\draw[thick, gray!50] (eco) -- (grass);

% Detail labels
\\node[detail, below=0.1cm] at (ocean.south) {Fish, Coral,\\\\Whales};
\\node[detail, above=0.1cm] at (forest.north) {Deer, Owls,\\\\Trees};
\\node[detail, below=0.1cm] at (desert.south) {Cactus, Lizards,\\\\Camels};
\\node[detail, below=0.1cm] at (arctic.south) {Polar Bears,\\\\Penguins};
\\node[detail, below=0.1cm] at (rain.south) {Monkeys, Parrots,\\\\Frogs};
\\node[detail, below=0.1cm] at (grass.south) {Lions, Zebras,\\\\Bison};
\\end{tikzpicture}`,
}
