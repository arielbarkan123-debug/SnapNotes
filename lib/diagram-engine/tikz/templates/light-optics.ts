import type { TikzTemplate } from '../index'

export const LIGHT_OPTICS_TEMPLATE: TikzTemplate = {
  id: 'light-optics',
  name: 'Light and Optics',
  keywords: [
    'light reflection', 'light refraction',
    'reflection of light', 'refraction of light',
    'prism rainbow', 'prism color spectrum',
    'color spectrum', 'light spectrum',
    'how light reflects', 'how light bends',
    'mirror reflection', 'light bending',
    'rainbow colors', 'roygbiv',
  ],
  gradeRange: [3, 6],
  topics: [116, 117],
  category: 'light-optics',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (4, 6) {Light Through a Prism};

% Incoming white light ray
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, yellow!80!orange] (0, 3.5) -- (3, 3.5);
\\node[label, above=0.2cm] at (1.5, 3.5) {White Light};

% Prism (triangle)
\\fill[cyan!10] (3, 2.5) -- (4.5, 4.5) -- (6, 2.5) -- cycle;
\\draw[very thick, cyan!50] (3, 2.5) -- (4.5, 4.5) -- (6, 2.5) -- cycle;
\\node[font=\\footnotesize\\bfseries] at (4.5, 3.2) {Prism};

% Separated color rays emerging
\\draw[very thick, red!80] (6, 3.8) -- (9, 5);
\\draw[very thick, orange!80] (6, 3.6) -- (9, 4.5);
\\draw[very thick, yellow!80] (6, 3.4) -- (9, 4);
\\draw[very thick, green!60!black] (6, 3.2) -- (9, 3.5);
\\draw[very thick, blue!70] (6, 3.0) -- (9, 3);
\\draw[very thick, blue!40!purple] (6, 2.8) -- (9, 2.5);
\\draw[very thick, purple!70] (6, 2.6) -- (9, 2);

% Color labels
\\node[font=\\scriptsize\\bfseries, red!80, right] at (9, 5) {Red};
\\node[font=\\scriptsize\\bfseries, orange!80, right] at (9, 4.5) {Orange};
\\node[font=\\scriptsize\\bfseries, yellow!80!black, right] at (9, 4) {Yellow};
\\node[font=\\scriptsize\\bfseries, green!60!black, right] at (9, 3.5) {Green};
\\node[font=\\scriptsize\\bfseries, blue!70, right] at (9, 3) {Blue};
\\node[font=\\scriptsize\\bfseries, blue!40!purple, right] at (9, 2.5) {Indigo};
\\node[font=\\scriptsize\\bfseries, purple!70, right] at (9, 2) {Violet};

% Note
\\node[font=\\scriptsize, gray, align=center] at (4.5, 1.2) {White light separates into\\\\a spectrum of colors};
\\end{tikzpicture}`,
}
