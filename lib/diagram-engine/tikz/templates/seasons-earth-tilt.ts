import type { TikzTemplate } from '../index'

export const SEASONS_EARTH_TILT_TEMPLATE: TikzTemplate = {
  id: 'seasons-earth-tilt',
  name: 'Seasons and Earth Tilt',
  keywords: [
    'seasons', 'four seasons',
    'earth tilt', 'earth axis',
    'summer winter spring fall',
    'equinox solstice',
    'why seasons', 'cause of seasons',
    'earth revolution', 'earth orbit seasons',
  ],
  gradeRange: [3, 6],
  topics: [106],
  category: 'seasons-earth-tilt',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.3]
% Title
\\node[font=\\large\\bfseries] at (6, 8) {Seasons and Earth's Tilt};

% Sun in center
\\fill[yellow!50] (6, 4) circle (0.8);
\\draw[very thick, yellow!70!orange] (6, 4) circle (0.8);
\\node[font=\\footnotesize\\bfseries] at (6, 4) {Sun};

% Orbit (ellipse)
\\draw[thick, gray!40, dashed] (6, 4) ellipse (4.5 and 3);

% Earth at 4 positions with tilt
% Summer (top) - Northern hemisphere tilted toward sun
\\fill[blue!40] (6, 7) circle (0.4);
\\draw[thick] (6, 7) circle (0.4);
\\draw[thick, red!60] (5.85, 6.55) -- (6.15, 7.45); % tilt axis
\\node[above=0.3cm, font=\\footnotesize\\bfseries] at (6, 7.4) {Summer};
\\node[above=0.1cm, font=\\scriptsize, gray] at (6, 7.7) {(June)};

% Winter (bottom) - Northern hemisphere tilted away
\\fill[blue!40] (6, 1) circle (0.4);
\\draw[thick] (6, 1) circle (0.4);
\\draw[thick, red!60] (5.85, 0.55) -- (6.15, 1.45); % tilt axis
\\node[below=0.3cm, font=\\footnotesize\\bfseries] at (6, 0.6) {Winter};
\\node[below=0.1cm, font=\\scriptsize, gray] at (6, 0.3) {(December)};

% Spring (left)
\\fill[blue!40] (1.5, 4) circle (0.4);
\\draw[thick] (1.5, 4) circle (0.4);
\\draw[thick, red!60] (1.35, 3.55) -- (1.65, 4.45); % tilt axis
\\node[left=0.3cm, font=\\footnotesize\\bfseries] at (1.1, 4) {Spring};
\\node[left=0.1cm, font=\\scriptsize, gray] at (0.8, 3.5) {(March)};

% Fall (right)
\\fill[blue!40] (10.5, 4) circle (0.4);
\\draw[thick] (10.5, 4) circle (0.4);
\\draw[thick, red!60] (10.35, 3.55) -- (10.65, 4.45); % tilt axis
\\node[right=0.3cm, font=\\footnotesize\\bfseries] at (10.9, 4) {Fall};
\\node[right=0.1cm, font=\\scriptsize, gray] at (11.2, 3.5) {(September)};

% Orbit direction arrow
\\draw[-{Stealth[length=3mm]}, thick, gray!60] (8.5, 6.8) arc (30:60:3);

% Note about tilt
\\node[font=\\scriptsize, gray, align=center] at (6, -0.5) {Earth's axis is tilted 23.5$^{\\circ}$};
\\end{tikzpicture}`,
}
