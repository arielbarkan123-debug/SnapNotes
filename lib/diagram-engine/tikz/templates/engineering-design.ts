import type { TikzTemplate } from '../index'

export const ENGINEERING_DESIGN_TEMPLATE: TikzTemplate = {
  id: 'engineering-design',
  name: 'Engineering Design Process',
  keywords: [
    'engineering design process', 'design process',
    'ask imagine plan create improve',
    'engineering cycle', 'design cycle',
    'build test improve', 'prototype test',
    'stem design process', 'stem challenge',
  ],
  gradeRange: [2, 6],
  topics: [152],
  category: 'engineering-design',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  step/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=2.2cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (4, 6.5) {Engineering Design Process};

% Steps in a cycle (clockwise from top)
\\node[step=yellow!25] (ask) at (4, 5) {Ask};
\\node[step=orange!20] (imagine) at (7, 3.5) {Imagine};
\\node[step=green!20] (plan) at (6, 1) {Plan};
\\node[step=blue!15] (create) at (2, 1) {Create};
\\node[step=purple!15] (improve) at (1, 3.5) {Improve};

% Cycle arrows
\\draw[arrow=red!50] (ask.east) to[bend left=15] (imagine.north);
\\draw[arrow=red!50] (imagine.south) to[bend left=15] (plan.east);
\\draw[arrow=red!50] (plan.west) to[bend left=15] (create.east);
\\draw[arrow=red!50] (create.west) to[bend left=15] (improve.south);
\\draw[arrow=red!50] (improve.north) to[bend left=15] (ask.west);

% Step details
\\node[font=\\scriptsize, gray, right=0.3cm] at (ask.east) {What is the problem?};
\\node[font=\\scriptsize, gray, right=0.3cm] at (imagine.east) {Brainstorm solutions};
\\node[font=\\scriptsize, gray, below=0.3cm] at (plan.south) {Draw a plan};
\\node[font=\\scriptsize, gray, left=0.3cm] at (create.west) {Build and test};
\\node[font=\\scriptsize, gray, left=0.3cm] at (improve.west) {Make it better};

% Step numbers
\\node[circle, fill=yellow!60, font=\\scriptsize\\bfseries, inner sep=2pt] at (4, 5.6) {1};
\\node[circle, fill=orange!50, font=\\scriptsize\\bfseries, inner sep=2pt] at (7.6, 3.5) {2};
\\node[circle, fill=green!50, font=\\scriptsize\\bfseries, inner sep=2pt] at (6, 0.4) {3};
\\node[circle, fill=blue!40, font=\\scriptsize\\bfseries, inner sep=2pt] at (2, 0.4) {4};
\\node[circle, fill=purple!40, font=\\scriptsize\\bfseries, inner sep=2pt] at (0.4, 3.5) {5};
\\end{tikzpicture}`,
}
