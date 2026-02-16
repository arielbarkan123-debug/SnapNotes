import type { TikzTemplate } from '../index'

export const EARTH_LAYERS_TEMPLATE: TikzTemplate = {
  id: 'earth-layers',
  name: 'Earth Layers',
  keywords: [
    'earth layers', 'layers of the earth',
    'crust mantle core', 'inner core outer core',
    'earth structure', 'earth cross section',
    'earth interior', 'inside the earth',
  ],
  gradeRange: [3, 6],
  topics: [105],
  category: 'earth-layers',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% Title
\\node[font=\\large\\bfseries] at (3, 5.5) {Layers of the Earth};

% Earth cross-section (half circle with layers)
% Inner Core
\\fill[red!60] (3, 2.5) circle (0.6);
\\draw[thick] (3, 2.5) circle (0.6);

% Outer Core
\\fill[orange!40] (3, 2.5) circle (1.2);
\\fill[red!60] (3, 2.5) circle (0.6);
\\draw[thick] (3, 2.5) circle (1.2);
\\draw[thick] (3, 2.5) circle (0.6);

% Mantle
\\fill[yellow!30] (3, 2.5) circle (2.2);
\\fill[orange!40] (3, 2.5) circle (1.2);
\\fill[red!60] (3, 2.5) circle (0.6);
\\draw[thick] (3, 2.5) circle (2.2);
\\draw[thick] (3, 2.5) circle (1.2);
\\draw[thick] (3, 2.5) circle (0.6);

% Crust (thin outer layer)
\\fill[brown!30] (3, 2.5) circle (2.5);
\\fill[yellow!30] (3, 2.5) circle (2.2);
\\fill[orange!40] (3, 2.5) circle (1.2);
\\fill[red!60] (3, 2.5) circle (0.6);
\\draw[thick] (3, 2.5) circle (2.5);
\\draw[thick] (3, 2.5) circle (2.2);
\\draw[thick] (3, 2.5) circle (1.2);
\\draw[thick] (3, 2.5) circle (0.6);

% Cut away wedge to show layers (white sector to hide part)
\\fill[white] (3, 2.5) -- ++(45:3) arc (45:90:3) -- cycle;

% Labels with leader lines
\\draw[-{Stealth[length=2mm]}, thick] (6.5, 4.8) -- (5.1, 4.2);
\\node[font=\\footnotesize\\bfseries, fill=white, inner sep=2pt, right] at (6.5, 4.8) {Crust (5-70 km)};

\\draw[-{Stealth[length=2mm]}, thick] (6.5, 3.5) -- (4.8, 3.2);
\\node[font=\\footnotesize\\bfseries, fill=white, inner sep=2pt, right] at (6.5, 3.5) {Mantle (2,900 km)};

\\draw[-{Stealth[length=2mm]}, thick] (6.5, 2.2) -- (4.2, 2.5);
\\node[font=\\footnotesize\\bfseries, fill=white, inner sep=2pt, right] at (6.5, 2.2) {Outer Core (2,200 km)};

\\draw[-{Stealth[length=2mm]}, thick] (6.5, 1) -- (3.6, 2.5);
\\node[font=\\footnotesize\\bfseries, fill=white, inner sep=2pt, right] at (6.5, 1) {Inner Core (1,200 km)};
\\end{tikzpicture}`,
}
