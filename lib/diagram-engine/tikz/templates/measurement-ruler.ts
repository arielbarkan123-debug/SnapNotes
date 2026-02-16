import type { TikzTemplate } from '../index'

export const MEASUREMENT_RULER_TEMPLATE: TikzTemplate = {
  id: 'measurement-ruler',
  name: 'Measurement and Rulers',
  keywords: [
    'measuring', 'measure length', 'ruler', 'centimeter',
    'centimeters long', 'inches long', 'how long',
    'paper clips long', 'cubes long', 'length of',
    'non-standard units', 'cm long', 'inch long',
    'measuring tape', 'measure the',
  ],
  gradeRange: [1, 3],
  topics: [13, 23],
  category: 'measurement-ruler',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.0]
  % Ruler body
  \\draw[thick, fill=yellow!10] (0, 0) rectangle (10, 1.5);
  % Centimeter marks and labels
  \\foreach \\x in {0,...,10} {
    \\draw[thick] (\\x, 0) -- (\\x, 0.6);
    \\node[below=2pt, font=\\normalsize] at (\\x, 0) {\\x};
  }
  % Half-centimeter marks
  \\foreach \\x in {0.5, 1.5, ..., 9.5} {
    \\draw[thin] (\\x, 0) -- (\\x, 0.35);
  }
  % Unit label
  \\node[above=2pt, font=\\footnotesize] at (5, 1.5) {centimeters (cm)};
  % Object being measured (pencil)
  \\draw[very thick, orange!70!black, rounded corners=1pt] (0, 2.0) -- (7, 2.0);
  \\fill[orange!70!black] (7, 2.0) -- (7.5, 2.0) -- (7.25, 2.15) -- cycle;
  % Measurement arrow
  \\draw[thick, blue, {Stealth[length=2mm]}-{Stealth[length=2mm]}] (0, 2.6) -- (7, 2.6);
  \\node[above=3pt, blue, font=\\large] at (3.5, 2.6) {7 cm};
\\end{tikzpicture}`,
}
