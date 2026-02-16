import type { TikzTemplate } from '../index'

export const WEATHER_CLOUDS_TEMPLATE: TikzTemplate = {
  id: 'weather-clouds',
  name: 'Weather and Cloud Types',
  keywords: [
    'cloud types', 'types of clouds',
    'cumulus', 'stratus', 'cirrus', 'cumulonimbus',
    'precipitation types', 'types of precipitation',
    'rain snow sleet hail',
    'weather diagram', 'weather chart',
    'cloud formation', 'how clouds form',
  ],
  gradeRange: [2, 5],
  topics: [101, 102],
  category: 'weather-clouds',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (5, 9) {Types of Clouds};

% Altitude axis
\\draw[-{Stealth[length=3mm]}, thick] (0, 0.5) -- (0, 8.5);
\\node[rotate=90, font=\\footnotesize\\bfseries] at (-0.5, 4.5) {Altitude};

% Altitude labels
\\node[left, font=\\scriptsize] at (0, 7.5) {High};
\\node[left, font=\\scriptsize] at (0, 4.5) {Middle};
\\node[left, font=\\scriptsize] at (0, 2) {Low};

% Ground
\\fill[green!10] (0, 0) rectangle (10, 0.5);
\\draw[thick, green!40] (0, 0.5) -- (10, 0.5);

% Cirrus (high, wispy)
\\draw[thick, gray!40] (2.5, 7.5) .. controls (3, 7.8) and (3.5, 7.3) .. (4, 7.6);
\\draw[thick, gray!40] (3, 7.2) .. controls (3.5, 7.5) and (4, 7) .. (4.5, 7.3);
\\node[label] at (5.5, 7.5) {Cirrus};
\\node[font=\\scriptsize, gray] at (5.5, 7) {Thin, wispy};

% Cumulus (middle, puffy)
\\fill[gray!20] (2.5, 4.5) ellipse (1.2 and 0.5);
\\fill[gray!20] (2, 5) ellipse (0.7 and 0.4);
\\fill[gray!20] (3, 5) ellipse (0.8 and 0.45);
\\draw[thick, gray!40] (2.5, 4.5) ellipse (1.2 and 0.5);
\\node[label] at (5.5, 4.8) {Cumulus};
\\node[font=\\scriptsize, gray] at (5.5, 4.3) {Puffy, white};

% Stratus (low, flat layer)
\\fill[gray!30] (1.5, 2) rectangle (4.5, 2.5);
\\draw[thick, gray!50] (1.5, 2) rectangle (4.5, 2.5);
\\fill[gray!25] (1.5, 2.3) ellipse (1.5 and 0.3);
\\fill[gray!25] (3.5, 2.3) ellipse (1.2 and 0.25);
\\node[label] at (5.5, 2.2) {Stratus};
\\node[font=\\scriptsize, gray] at (5.5, 1.7) {Flat, layered};

% Cumulonimbus (tall storm cloud) on the right
\\fill[gray!35] (8, 1.5) -- (8, 6) -- (7, 6.5) -- (9, 6.5) -- (8, 6) -- (9.5, 5) -- (8, 1.5);
\\fill[gray!40] (8, 5.8) ellipse (1.2 and 0.6);
\\draw[thick, gray!60] (8, 5.8) ellipse (1.2 and 0.6);
\\node[label] at (8, 7.3) {Cumulonimbus};
\\node[font=\\scriptsize, gray] at (8, 6.8) {Storm cloud};

% Rain from cumulonimbus
\\foreach \\x in {7.5, 8, 8.5} {
  \\draw[thick, blue!50] (\\x, 1.5) -- (\\x-0.15, 0.8);
}
\\end{tikzpicture}`,
}
