import type { TikzTemplate } from '../index'

export const PROPERTIES_OF_MATTER_TEMPLATE: TikzTemplate = {
  id: 'properties-of-matter',
  name: 'Properties of Matter',
  keywords: [
    'properties of matter', 'mass volume density',
    'mass and volume', 'physical properties',
    'density', 'matter properties',
    'weight and mass', 'measure matter',
  ],
  gradeRange: [3, 5],
  topics: [197],
  category: 'properties-of-matter',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  sectiontitle/.style={font=\\normalsize\\bfseries, fill=white, inner sep=4pt}
]
% Main Title
\\node[font=\\large\\bfseries] at (5, 12) {Properties of Matter};

% ===== SECTION 1: MASS (top) =====
\\node[sectiontitle, blue!70] at (5, 11) {Mass -- How much matter is in an object};

% Balance scale base
\\fill[gray!30] (4.5, 8.5) rectangle (5.5, 8.7);
\\draw[thick] (4.5, 8.5) rectangle (5.5, 8.7);
\\fill[gray!40] (4.8, 8.7) rectangle (5.2, 9.8);
\\draw[thick] (4.8, 8.7) -- (4.8, 9.8);
\\draw[thick] (5.2, 8.7) -- (5.2, 9.8);

% Balance beam
\\draw[very thick] (2.5, 10) -- (7.5, 10);
\\fill[gray!50] (5, 9.8) -- (4.8, 10) -- (5.2, 10) -- cycle;

% Left pan (object side)
\\draw[thick] (2.2, 9.5) -- (2.5, 10);
\\draw[thick] (3.8, 9.5) -- (3.5, 10);
\\draw[thick] (2.2, 9.5) -- (3.8, 9.5);
\\fill[red!30] (2.5, 9.5) rectangle (3.5, 10.0);
\\draw[thick] (2.5, 9.5) rectangle (3.5, 10.0);
\\node[font=\\scriptsize\\bfseries] at (3, 9.75) {Object};

% Right pan (weights side)
\\draw[thick] (6.2, 9.5) -- (6.5, 10);
\\draw[thick] (7.8, 9.5) -- (7.5, 10);
\\draw[thick] (6.2, 9.5) -- (7.8, 9.5);
\\fill[blue!30] (6.6, 9.5) rectangle (7, 9.8);
\\fill[blue!30] (7.0, 9.5) rectangle (7.4, 9.8);
\\draw[thick] (6.6, 9.5) rectangle (7, 9.8);
\\draw[thick] (7.0, 9.5) rectangle (7.4, 9.8);
\\node[font=\\scriptsize\\bfseries] at (7, 9.2) {Weights};

\\node[font=\\scriptsize, align=center] at (5, 8.2) {Mass is measured in grams (g)\\\\or kilograms (kg)};

% ===== SECTION 2: VOLUME (middle) =====
\\node[sectiontitle, green!50!black] at (5, 7.2) {Volume -- How much space an object takes up};

% Graduated cylinder
\\fill[blue!15] (4.3, 4.5) rectangle (5.7, 6.2);
\\draw[very thick] (4.3, 4.2) -- (4.3, 6.5) -- (5.7, 6.5) -- (5.7, 4.2);
\\draw[thick] (4.3, 4.2) -- (5.7, 4.2);

% Water level line (before object)
\\draw[thick, blue!50, dashed] (4.3, 5.5) -- (5.7, 5.5);
\\node[font=\\scriptsize, blue!60, right] at (5.8, 5.5) {Water rises};

% Water level line (after object)
\\draw[very thick, blue!70] (4.3, 6.0) -- (5.7, 6.0);
\\node[font=\\scriptsize, blue!70, right] at (5.8, 6.0) {New level};

% Object submerged
\\fill[red!40] (4.7, 4.8) rectangle (5.3, 5.3);
\\draw[thick] (4.7, 4.8) rectangle (5.3, 5.3);

% Graduation marks
\\draw[thin] (4.3, 4.8) -- (4.5, 4.8);
\\draw[thin] (4.3, 5.1) -- (4.5, 5.1);
\\draw[thin] (4.3, 5.5) -- (4.5, 5.5);
\\draw[thin] (4.3, 5.8) -- (4.5, 5.8);
\\draw[thin] (4.3, 6.2) -- (4.5, 6.2);

% Arrow showing displacement
\\draw[-{Stealth[length=2mm]}, thick, orange!70] (3.5, 5.5) -- (3.5, 6.0);
\\node[font=\\scriptsize, orange!70, left] at (3.4, 5.75) {Volume};

\\node[font=\\scriptsize, align=center] at (5, 3.9) {Volume is measured in mL or cm\\textsuperscript{3}};

% ===== SECTION 3: DENSITY (bottom) =====
\\node[sectiontitle, purple!70] at (5, 3.1) {Density -- How tightly packed matter is};

% Water container
\\fill[blue!10] (1.5, 0.3) rectangle (8.5, 2.5);
\\draw[very thick, blue!40] (1.5, 0.3) rectangle (8.5, 2.5);
\\draw[thick, blue!30] (1.5, 2.5) -- (8.5, 2.5);
\\node[font=\\scriptsize, blue!50] at (5, 0.15) {Water};

% Wood block (floats on top)
\\fill[yellow!40] (2, 2.0) rectangle (3.2, 2.7);
\\draw[thick] (2, 2.0) rectangle (3.2, 2.7);
\\node[font=\\scriptsize\\bfseries] at (2.6, 2.35) {Wood};
\\node[font=\\scriptsize, below] at (2.6, 1.8) {Floats};

% Plastic block (middle)
\\fill[green!30] (4.3, 1.2) rectangle (5.5, 1.9);
\\draw[thick] (4.3, 1.2) rectangle (5.5, 1.9);
\\node[font=\\scriptsize\\bfseries] at (4.9, 1.55) {Plastic};
\\node[font=\\scriptsize, above] at (4.9, 2.0) {Middle};

% Metal block (sinks)
\\fill[gray!50] (6.5, 0.4) rectangle (7.7, 1.1);
\\draw[thick] (6.5, 0.4) rectangle (7.7, 1.1);
\\node[font=\\scriptsize\\bfseries] at (7.1, 0.75) {Metal};
\\node[font=\\scriptsize, above] at (7.1, 1.2) {Sinks};

% Density equation
\\node[draw, thick, rounded corners=4pt, fill=yellow!10, font=\\footnotesize, align=center, inner sep=4pt] at (5, -0.5) {
  \\textbf{Density} = Mass $\\div$ Volume
};
\\end{tikzpicture}`,
}
