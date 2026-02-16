import type { TikzTemplate } from '../index'

export const ACTIVITY_PYRAMID_TEMPLATE: TikzTemplate = {
  id: 'activity-pyramid',
  name: 'Physical Activity Pyramid',
  keywords: [
    'physical activity pyramid', 'exercise pyramid',
    'activity levels', 'daily exercise',
    'active lifestyle', 'fitness pyramid',
    'exercise types', 'physical fitness',
  ],
  gradeRange: [2, 5],
  topics: [220],
  category: 'activity-pyramid',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  labelright/.style={font=\\scriptsize, anchor=west, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 9.5) {Physical Activity Pyramid};

% Tier 1 -- Bottom (Daily Activities, green)
\\fill[green!30, draw=green!50!black, very thick] (1, 1) -- (9, 1) -- (8, 2.8) -- (2, 2.8) -- cycle;
\\node[font=\\footnotesize\\bfseries, green!50!black] at (5, 2.2) {Daily Activities};
\\node[font=\\scriptsize, green!40!black] at (5, 1.5) {Walk, play outside, do chores};

% Tier 2 -- Active Sports (blue)
\\fill[blue!25, draw=blue!60, very thick] (2, 2.8) -- (8, 2.8) -- (7, 4.6) -- (3, 4.6) -- cycle;
\\node[font=\\footnotesize\\bfseries, blue!70] at (5, 4.0) {Active Sports};
\\node[font=\\scriptsize, blue!60] at (5, 3.3) {Swimming, biking, running};

% Tier 3 -- Strength/Flexibility (orange)
\\fill[orange!25, draw=orange!60, very thick] (3, 4.6) -- (7, 4.6) -- (6, 6.4) -- (4, 6.4) -- cycle;
\\node[font=\\footnotesize\\bfseries, orange!70] at (5, 5.8) {Strength / Flexibility};
\\node[font=\\scriptsize, orange!60] at (5, 5.1) {Push-ups, stretching, yoga};

% Tier 4 -- Top (Limit Screen Time, red)
\\fill[red!25, draw=red!60, very thick] (4, 6.4) -- (6, 6.4) -- (5, 8.2) -- cycle;
\\node[font=\\footnotesize\\bfseries, red!70] at (5, 7.5) {Limit};
\\node[font=\\scriptsize, red!60] at (5, 6.9) {Screen time};

% Right-side labels with arrows
\\draw[-{Stealth[length=2mm]}, thick, green!50!black] (9.3, 1.9) -- (8.8, 1.9);
\\node[labelright=green!50!black] at (9.5, 1.9) {Every day};

\\draw[-{Stealth[length=2mm]}, thick, blue!60] (9.3, 3.7) -- (8.2, 3.7);
\\node[labelright=blue!60] at (9.5, 3.7) {3--5 times/week};

\\draw[-{Stealth[length=2mm]}, thick, orange!60] (9.3, 5.5) -- (7.5, 5.5);
\\node[labelright=orange!60] at (9.5, 5.5) {2--3 times/week};

\\draw[-{Stealth[length=2mm]}, thick, red!60] (9.3, 7.3) -- (6.5, 7.3);
\\node[labelright=red!60] at (9.5, 7.3) {Use sparingly};

% Bottom note
\\node[font=\\scriptsize, gray, align=center] at (5, 0.3) {Move more as you go down the pyramid!};
\\end{tikzpicture}`,
}
