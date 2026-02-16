import type { TikzTemplate } from '../index'

export const STORY_ELEMENTS_TEMPLATE: TikzTemplate = {
  id: 'story-elements',
  name: 'Story Elements',
  keywords: [
    'story elements', 'character setting plot',
    'characters setting problem solution',
    'story parts', 'elements of a story',
    'beginning middle end',
    'story map', 'narrative elements',
  ],
  gradeRange: [1, 4],
  topics: [212],
  category: 'story-elements',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.3,
  ebox/.style={draw, very thick, fill=#1, minimum width=2.2cm, minimum height=1.6cm, align=center, font=\\scriptsize\\bfseries, rounded corners=5pt},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, gray!60}
]
% Title
\\node[font=\\large\\bfseries] at (6, 6.5) {Story Elements};

% Box 1: Characters (blue)
\\node[ebox=blue!20] (char) at (1, 4.5) {Characters\\\\[3pt]{\\tiny Who is in}\\\\{\\tiny the story?}};
\\node[circle, fill=blue!50, text=white, font=\\scriptsize\\bfseries, inner sep=2pt] at (0, 5.2) {1};

% Box 2: Setting (green)
\\node[ebox=green!20] (set) at (4, 4.5) {Setting\\\\[3pt]{\\tiny Where? When?}};
\\node[circle, fill=green!50!black, text=white, font=\\scriptsize\\bfseries, inner sep=2pt] at (3, 5.2) {2};

% Box 3: Problem (red)
\\node[ebox=red!20] (prob) at (7, 4.5) {Problem\\\\[3pt]{\\tiny What goes}\\\\{\\tiny wrong?}};
\\node[circle, fill=red!50, text=white, font=\\scriptsize\\bfseries, inner sep=2pt] at (6, 5.2) {3};

% Box 4: Events (orange)
\\node[ebox=orange!20] (evt) at (10, 4.5) {Events\\\\[3pt]{\\tiny What}\\\\{\\tiny happens?}};
\\node[circle, fill=orange!60, text=white, font=\\scriptsize\\bfseries, inner sep=2pt] at (9, 5.2) {4};

% Box 5: Solution (purple)
\\node[ebox=purple!20] (sol) at (6.5, 1.8) {Solution\\\\[3pt]{\\tiny How is it}\\\\{\\tiny fixed?}};
\\node[circle, fill=purple!50, text=white, font=\\scriptsize\\bfseries, inner sep=2pt] at (5.5, 2.5) {5};

% Arrows connecting boxes
\\draw[arrow] (char.east) -- (set.west);
\\draw[arrow] (set.east) -- (prob.west);
\\draw[arrow] (prob.east) -- (evt.west);
\\draw[arrow] (evt.south) -- ++(0, -0.8) -| (sol.east);

% Labels on arrows
\\node[font=\\scriptsize, fill=white, inner sep=1pt] at (2.5, 4.8) {then};
\\node[font=\\scriptsize, fill=white, inner sep=1pt] at (5.5, 4.8) {but};
\\node[font=\\scriptsize, fill=white, inner sep=1pt] at (8.5, 4.8) {so};

% Bottom decorative section
\\draw[thick, gray!30, dashed] (0, 0.7) -- (12, 0.7);
\\node[font=\\scriptsize, text=gray!60!black, align=center] at (6, 0.3) {Every good story has Characters, a Setting, a Problem, Events, and a Solution!};
\\end{tikzpicture}`,
}
