import type { TikzTemplate } from '../index'

export const MIXTURES_SOLUTIONS_TEMPLATE: TikzTemplate = {
  id: 'mixtures-solutions',
  name: 'Mixtures and Solutions',
  keywords: [
    'mixture', 'solution',
    'mixtures and solutions', 'dissolve',
    'separate mixture', 'salt water solution',
    'trail mix mixture', 'homogeneous heterogeneous',
  ],
  gradeRange: [3, 5],
  topics: [198],
  category: 'mixtures-solutions',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Mixtures vs. Solutions};

% ===== LEFT SIDE: MIXTURE =====
\\node[font=\\normalsize\\bfseries, blue!70] at (2.2, 6.2) {Mixture};

% Bowl shape
\\draw[very thick] (0.5, 3.5) .. controls (0.5, 2.5) and (1, 2) .. (2.2, 2) .. controls (3.4, 2) and (3.9, 2.5) .. (3.9, 3.5);
\\draw[very thick] (0.5, 3.5) -- (0.3, 3.7);
\\draw[very thick] (3.9, 3.5) -- (4.1, 3.7);

% Fill bowl with light background
\\fill[yellow!10] (0.6, 3.5) .. controls (0.6, 2.6) and (1.1, 2.1) .. (2.2, 2.1) .. controls (3.3, 2.1) and (3.8, 2.6) .. (3.8, 3.5) -- cycle;

% Visible different parts (trail mix items)
% Peanuts (brown circles)
\\fill[brown!50] (1.2, 2.8) circle (0.18);
\\fill[brown!50] (2.5, 2.5) circle (0.18);
\\fill[brown!50] (3.2, 3.0) circle (0.18);
% Raisins (dark circles)
\\fill[purple!60] (1.8, 2.4) circle (0.14);
\\fill[purple!60] (2.8, 2.7) circle (0.14);
\\fill[purple!60] (1.5, 3.2) circle (0.14);
% Cereal (orange squares)
\\fill[orange!50] (1.0, 3.1) rectangle (1.3, 3.35);
\\fill[orange!50] (2.0, 2.9) rectangle (2.3, 3.15);
\\fill[orange!50] (3.0, 2.4) rectangle (3.3, 2.65);
% Candy (green)
\\fill[green!50] (1.6, 2.7) circle (0.12);
\\fill[green!50] (2.6, 3.2) circle (0.12);
\\fill[green!50] (3.4, 2.5) circle (0.12);

% Mixture description
\\node[font=\\scriptsize, align=center, text width=3.5cm] at (2.2, 5.3) {You can \\textbf{see} the\\\\different parts};

% Label: "Parts can be separated"
\\node[draw, thick, rounded corners=3pt, fill=green!10, font=\\scriptsize\\bfseries, align=center, inner sep=4pt] at (2.2, 4.3) {Parts can be\\\\separated};

% Example label
\\node[font=\\scriptsize, gray!70] at (2.2, 1.5) {Example: Trail Mix};

% ===== RIGHT SIDE: SOLUTION =====
\\node[font=\\normalsize\\bfseries, red!60] at (7.8, 6.2) {Solution};

% Beaker shape
\\draw[very thick] (6.2, 2) -- (6.2, 5) -- (9.4, 5) -- (9.4, 2) -- cycle;
\\draw[very thick] (6.0, 5) -- (6.2, 5);
\\draw[very thick] (9.4, 5) -- (9.6, 5);

% Uniform blue fill (dissolved)
\\fill[blue!20] (6.3, 2.1) rectangle (9.3, 4.5);

% Water level line
\\draw[thick, blue!40] (6.2, 4.5) -- (9.4, 4.5);

% Graduation marks on beaker
\\draw[thin] (6.2, 2.7) -- (6.5, 2.7);
\\draw[thin] (6.2, 3.3) -- (6.5, 3.3);
\\draw[thin] (6.2, 3.9) -- (6.5, 3.9);

% Solution description
\\node[font=\\scriptsize, align=center, text width=3.5cm] at (7.8, 5.3) {Dissolved -- looks the\\\\\\textbf{same throughout}};

% Label: "Cannot see separate parts"
\\node[draw, thick, rounded corners=3pt, fill=red!10, font=\\scriptsize\\bfseries, align=center, inner sep=4pt] at (7.8, 4.8) {Cannot see\\\\separate parts};

% Example label
\\node[font=\\scriptsize, gray!70] at (7.8, 1.5) {Example: Salt Water};

% Salt + Water arrow below beaker
\\node[font=\\scriptsize\\bfseries] at (6.5, 1.0) {Salt};
\\node[font=\\scriptsize] at (7.2, 1.0) {+};
\\node[font=\\scriptsize\\bfseries, blue!60] at (7.8, 1.0) {Water};
\\draw[arrow=red!50] (8.3, 1.0) -- (9.0, 1.0);
\\node[font=\\scriptsize\\bfseries, red!60] at (9.6, 1.0) {Solution};

% Dividing line between sides
\\draw[thick, dashed, gray!40] (5, 1) -- (5, 6.5);

% VS label
\\node[font=\\normalsize\\bfseries, fill=white, inner sep=3pt] at (5, 4) {vs.};
\\end{tikzpicture}`,
}
