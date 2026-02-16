import type { TikzTemplate } from '../index'

export const SOLAR_SYSTEM_TEMPLATE: TikzTemplate = {
  id: 'solar-system',
  name: 'Solar System',
  keywords: [
    'solar system', 'planets',
    'mercury venus earth mars jupiter saturn',
    'inner planets', 'outer planets',
    'planet order', 'planet orbits',
    'sun and planets', 'order of planets',
  ],
  gradeRange: [2, 6],
  topics: [103, 109],
  category: 'solar-system',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.7]
% Title
\\node[font=\\large\\bfseries] at (7, 9) {The Solar System};

% Sun (left side)
\\fill[yellow!50] (0, 4.5) circle (1);
\\draw[very thick, yellow!70!orange] (0, 4.5) circle (1);
\\node[font=\\footnotesize\\bfseries] at (0, 4.5) {Sun};

% Orbits and planets
\\draw[thin, gray!30] (0,4.5) circle (2);
\\fill[gray!50] (2, 4.5) circle (0.1);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (2, 4.6) {Mercury};

\\draw[thin, gray!30] (0,4.5) circle (3);
\\fill[orange!40] (3, 4.5) circle (0.15);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (3, 4.65) {Venus};

\\draw[thin, gray!30] (0,4.5) circle (4);
\\fill[blue!50] (4, 4.5) circle (0.17);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (4, 4.67) {Earth};

\\draw[thin, gray!30] (0,4.5) circle (5);
\\fill[red!40] (5, 4.5) circle (0.13);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (5, 4.63) {Mars};

\\draw[thin, gray!30] (0,4.5) circle (7);
\\fill[orange!30] (7, 4.5) circle (0.35);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (7, 4.85) {Jupiter};

\\draw[thin, gray!30] (0,4.5) circle (9);
\\fill[yellow!40] (9, 4.5) circle (0.3);
\\draw[thick, yellow!60!brown] (9, 4.5) ellipse (0.55 and 0.12);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (9, 4.8) {Saturn};

\\draw[thin, gray!30] (0,4.5) circle (11);
\\fill[cyan!40] (11, 4.5) circle (0.22);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (11, 4.72) {Uranus};

\\draw[thin, gray!30] (0,4.5) circle (12.5);
\\fill[blue!60] (12.5, 4.5) circle (0.2);
\\node[above=0.15cm, font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at (12.5, 4.7) {Neptune};

% Inner/Outer divider
\\draw[thick, dashed, gray!50] (6, 0.5) -- (6, 8.5);
\\node[font=\\scriptsize, gray, fill=white, inner sep=2pt] at (3, 1) {Inner Planets};
\\node[font=\\scriptsize, gray, fill=white, inner sep=2pt] at (9.5, 1) {Outer Planets};
\\end{tikzpicture}`,
}
