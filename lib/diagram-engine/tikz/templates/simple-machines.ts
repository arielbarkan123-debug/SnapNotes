import type { TikzTemplate } from '../index'

export const SIMPLE_MACHINES_TEMPLATE: TikzTemplate = {
  id: 'simple-machines',
  name: 'Simple Machines',
  keywords: [
    'simple machine', 'simple machines',
    'lever fulcrum', 'lever diagram',
    'pulley diagram', 'inclined plane simple machine',
    'wheel and axle', 'screw simple machine',
    'wedge simple machine',
    'six simple machines', 'types of simple machines',
    'mechanical advantage',
  ],
  gradeRange: [3, 6],
  topics: [112, 113],
  category: 'simple-machines',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Six Simple Machines};

% 1. Lever
\\fill[gray!20] (0.5, 5) -- (1.5, 5) -- (1, 5.4) -- cycle; % fulcrum triangle
\\draw[thick] (0.5, 5) -- (1.5, 5) -- (1, 5.4) -- cycle;
\\draw[very thick, brown!60] (-0.5, 5.7) -- (2.5, 5.1); % beam
\\fill[blue!40] (-0.3, 5.8) circle (0.15); % load
\\draw[-{Stealth[length=2mm]}, thick, red!60] (2.3, 5.1) -- (2.3, 5.8); % effort arrow
\\node[label, below] at (1, 4.5) {Lever};
\\node[font=\\scriptsize, gray] at (1, 4.1) {Fulcrum};

% 2. Wheel and Axle
\\draw[thick, fill=gray!15] (4, 5.3) circle (0.6); % wheel
\\draw[thick, fill=gray!30] (4, 5.3) circle (0.15); % axle
\\draw[thick] (4, 5.3) -- (4.6, 5.3); % spoke
\\draw[thick] (4, 5.3) -- (4, 5.9); % spoke
\\node[label, below] at (4, 4.5) {Wheel \\& Axle};

% 3. Pulley
\\draw[thick, fill=gray!15] (7, 5.8) circle (0.3); % pulley wheel
\\draw[thick] (7, 6.2) -- (7, 5.8); % support
\\draw[thick, blue!50] (6.7, 5.8) -- (6.7, 4.8); % rope left
\\draw[thick, blue!50] (7.3, 5.8) -- (7.3, 4.8); % rope right
\\fill[red!40] (6.7, 4.8) circle (0.15); % load
\\node[label, below] at (7, 4.3) {Pulley};

% 4. Inclined Plane
\\fill[brown!20] (0, 2) -- (3, 2) -- (3, 3.2) -- cycle;
\\draw[thick, brown!40] (0, 2) -- (3, 2) -- (3, 3.2) -- cycle;
\\fill[blue!30] (1.5, 2.6) circle (0.15); % object on ramp
\\draw[-{Stealth[length=2mm]}, thick, red!60] (1.5, 2.6) -- (2.2, 3); % push arrow
\\node[label, below] at (1.5, 1.5) {Inclined Plane};

% 5. Wedge
\\fill[gray!30] (4.5, 2) -- (5.5, 2) -- (5, 3.5) -- cycle;
\\draw[thick] (4.5, 2) -- (5.5, 2) -- (5, 3.5) -- cycle;
\\draw[-{Stealth[length=2mm]}, thick, red!60] (5, 3.8) -- (5, 3.5); % force arrow
\\node[label, below] at (5, 1.5) {Wedge};

% 6. Screw
\\draw[thick, brown!50] (7, 2) -- (7, 3.5); % shaft
\\draw[thick, brown!50] (7, 3.5) -- (6.5, 3.5) -- (7.5, 3.5); % head
\\foreach \\y in {2.2, 2.6, 3.0, 3.4} {
  \\draw[thick, gray!50] (6.7, \\y) -- (7.3, \\y-0.15);
}
\\node[label, below] at (7, 1.5) {Screw};
\\end{tikzpicture}`,
}
