import type { TikzTemplate } from '../index'

export const MAGNETS_TEMPLATE: TikzTemplate = {
  id: 'magnets',
  name: 'Magnets',
  keywords: [
    'magnet', 'magnets',
    'magnetic poles', 'north pole south pole',
    'attract repel magnet', 'attraction repulsion',
    'magnetic field', 'field lines magnet',
    'bar magnet', 'horseshoe magnet',
    'magnetism', 'magnetic force',
  ],
  gradeRange: [2, 5],
  topics: [114, 115],
  category: 'magnets',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.4,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (5, 6.5) {Magnets: Attraction and Repulsion};

% Bar magnet 1 (left)
\\fill[red!40] (1, 4.5) rectangle (2.5, 5.3);
\\fill[blue!40] (2.5, 4.5) rectangle (4, 5.3);
\\draw[thick] (1, 4.5) rectangle (4, 5.3);
\\draw[thick] (2.5, 4.5) -- (2.5, 5.3);
\\node[font=\\footnotesize\\bfseries, white] at (1.75, 4.9) {N};
\\node[font=\\footnotesize\\bfseries, white] at (3.25, 4.9) {S};

% Bar magnet 2 (right) - opposite poles facing = attract
\\fill[blue!40] (6, 4.5) rectangle (7.5, 5.3);
\\fill[red!40] (7.5, 4.5) rectangle (9, 5.3);
\\draw[thick] (6, 4.5) rectangle (9, 5.3);
\\draw[thick] (7.5, 4.5) -- (7.5, 5.3);
\\node[font=\\footnotesize\\bfseries, white] at (6.75, 4.9) {S};
\\node[font=\\footnotesize\\bfseries, white] at (8.25, 4.9) {N};

% Attraction arrows
\\draw[-{Stealth[length=3mm]}, very thick, green!60!black] (4.2, 4.9) -- (5.8, 4.9);
\\draw[-{Stealth[length=3mm]}, very thick, green!60!black] (5.8, 4.9) -- (4.2, 4.9);
\\node[label, green!50!black, above=0.2cm] at (5, 5.3) {Attract (S--N)};

% Repulsion example below
% Magnet 3
\\fill[red!40] (1, 2) rectangle (2.5, 2.8);
\\fill[blue!40] (2.5, 2) rectangle (4, 2.8);
\\draw[thick] (1, 2) rectangle (4, 2.8);
\\draw[thick] (2.5, 2) -- (2.5, 2.8);
\\node[font=\\footnotesize\\bfseries, white] at (1.75, 2.4) {N};
\\node[font=\\footnotesize\\bfseries, white] at (3.25, 2.4) {S};

% Magnet 4 - same poles facing = repel
\\fill[red!40] (6, 2) rectangle (7.5, 2.8);
\\fill[blue!40] (7.5, 2) rectangle (9, 2.8);
\\draw[thick] (6, 2) rectangle (9, 2.8);
\\draw[thick] (7.5, 2) -- (7.5, 2.8);
\\node[font=\\footnotesize\\bfseries, white] at (6.75, 2.4) {N};
\\node[font=\\footnotesize\\bfseries, white] at (8.25, 2.4) {S};

% Repulsion arrows
\\draw[{Stealth[length=3mm]}-, very thick, red!60] (4.2, 2.4) -- (4.8, 2.4);
\\draw[-{Stealth[length=3mm]}, very thick, red!60] (5.2, 2.4) -- (5.8, 2.4);
\\node[label, red!60, above=0.2cm] at (5, 2.8) {Repel (S--S)};

% Rule at bottom
\\node[draw, thick, rounded corners=4pt, fill=yellow!10, font=\\footnotesize, align=center, inner sep=6pt] at (5, 0.5) {
  \\textbf{Rule:} Opposite poles attract, same poles repel
};
\\end{tikzpicture}`,
}
