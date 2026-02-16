import type { TikzTemplate } from '../index'

export const ENERGY_TYPES_TEMPLATE: TikzTemplate = {
  id: 'energy-types',
  name: 'Energy Types',
  keywords: [
    'energy types', 'types of energy',
    'kinetic energy potential energy',
    'kinetic energy', 'potential energy',
    'thermal energy', 'electrical energy',
    'chemical energy', 'light energy',
    'forms of energy', 'energy forms',
    'heat transfer', 'conduction convection radiation',
    'energy conversion', 'energy transformation',
  ],
  gradeRange: [3, 6],
  topics: [119, 121],
  category: 'energy-types',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  energy/.style={draw, thick, rounded corners=6pt, fill=#1, minimum width=2.4cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=2.5mm]}, thick, gray!50}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7.5) {Types of Energy};

% Central concept
\\node[draw, very thick, circle, fill=yellow!20, minimum size=1.8cm, font=\\footnotesize\\bfseries] (center) at (5, 4.5) {Energy};

% Energy types around the center
\\node[energy=red!15] (kinetic) at (1, 6.5) {Kinetic\\\\(Motion)};
\\node[energy=blue!15] (potential) at (5, 7) {Potential\\\\(Stored)};
\\node[energy=orange!15] (thermal) at (9, 6.5) {Thermal\\\\(Heat)};
\\node[energy=yellow!15] (light) at (1, 2.5) {Light\\\\(Radiant)};
\\node[energy=green!15] (chemical) at (5, 1.5) {Chemical\\\\(In Food/Fuel)};
\\node[energy=purple!15] (electrical) at (9, 2.5) {Electrical\\\\(Electricity)};

% Connections
\\draw[arrow] (center) -- (kinetic);
\\draw[arrow] (center) -- (potential);
\\draw[arrow] (center) -- (thermal);
\\draw[arrow] (center) -- (light);
\\draw[arrow] (center) -- (chemical);
\\draw[arrow] (center) -- (electrical);

% Examples
\\node[font=\\scriptsize, gray] at (1, 5.6) {Running, wind};
\\node[font=\\scriptsize, gray] at (5, 7.8) {Rubber band, height};
\\node[font=\\scriptsize, gray] at (9, 5.6) {Fire, body heat};
\\node[font=\\scriptsize, gray] at (1, 1.6) {Sun, lamp};
\\node[font=\\scriptsize, gray] at (5, 0.7) {Food, batteries};
\\node[font=\\scriptsize, gray] at (9, 1.6) {Lightning, outlets};
\\end{tikzpicture}`,
}
