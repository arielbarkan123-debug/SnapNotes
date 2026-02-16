import type { TikzTemplate } from '../index'

export const DECOMPOSITION_CYCLE_TEMPLATE: TikzTemplate = {
  id: 'decomposition-cycle',
  name: 'Decomposition / Nutrient Cycle',
  keywords: [
    'decomposition', 'decomposers',
    'nutrient cycle', 'decay',
    'decompose', 'fungi bacteria',
    'break down dead matter', 'compost cycle',
    'food web decomposers',
  ],
  gradeRange: [3, 5],
  topics: [202],
  category: 'decomposition-cycle',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.4,
  stage/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=2.6cm, minimum height=1.5cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3.5mm,width=2.5mm]}, very thick, #1, line width=1.3pt},
  num/.style={circle, fill=green!60!black, text=white, font=\\footnotesize\\bfseries, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (4, 6.5) {Nutrient Cycle};

% Center label
\\node[font=\\normalsize\\bfseries, green!50!black, align=center] at (4, 3.2) {Nutrients\\\\Recycle};

% ===== STAGE 1: Living Organism (top) =====
\\node[stage=green!20] (living) at (4, 5.5) {
  \\textcolor{green!50!black}{1. Living Organism}\\\\[3pt]
  \\scriptsize Plant or animal\\\\
  \\scriptsize grows and lives
};

% Small plant icon above stage 1
\\draw[very thick, green!50!black] (4, 6.1) -- (4, 6.3);
\\fill[green!40] (3.8, 6.3) .. controls (3.7, 6.5) and (3.9, 6.6) .. (4, 6.5) .. controls (4.1, 6.6) and (4.3, 6.5) .. (4.2, 6.3) -- cycle;

% ===== STAGE 2: Dead Matter (right) =====
\\node[stage=brown!20] (dead) at (7.5, 3.2) {
  \\textcolor{brown!60}{2. Dead Matter}\\\\[3pt]
  \\scriptsize Leaves, wood, and\\\\
  \\scriptsize animal remains fall
};

% Small leaf icons near stage 2
\\fill[brown!40] (8.6, 4.0) ellipse (0.2 and 0.1);
\\fill[brown!50] (8.3, 3.8) ellipse (0.15 and 0.08);
\\fill[brown!30] (8.8, 3.7) ellipse (0.18 and 0.09);

% ===== STAGE 3: Decomposers (bottom) =====
\\node[stage=orange!15] (decomp) at (4, 0.8) {
  \\textcolor{orange!70!black}{3. Decomposers}\\\\[3pt]
  \\scriptsize Fungi and bacteria\\\\
  \\scriptsize break down matter
};

% Mushroom icon near stage 3
% Stem
\\fill[yellow!30] (3.0, 0.2) rectangle (3.15, 0.5);
% Cap
\\fill[red!40] (2.8, 0.5) .. controls (2.8, 0.8) and (3.35, 0.8) .. (3.35, 0.5) -- cycle;
% Small bacteria dots
\\fill[green!40] (5.1, 0.2) circle (0.06);
\\fill[green!40] (5.2, 0.35) circle (0.05);
\\fill[green!40] (5.3, 0.2) circle (0.06);

% ===== STAGE 4: Nutrients Return to Soil (left) =====
\\node[stage=yellow!20] (soil) at (0.5, 3.2) {
  \\textcolor{yellow!50!black}{4. Nutrients in Soil}\\\\[3pt]
  \\scriptsize Rich minerals return\\\\
  \\scriptsize to the ground
};

% Soil texture near stage 4
\\fill[brown!30] (-0.6, 2.2) rectangle (1.6, 2.4);
\\fill[brown!40] (-0.3, 2.4) rectangle (0.2, 2.5);
\\fill[brown!40] (0.8, 2.4) rectangle (1.3, 2.5);

% ===== CURVED ARROWS connecting stages in a cycle =====
% 1 -> 2 (Living to Dead)
\\draw[arrow=brown!60] (living.east) to[bend left=30] (dead.north);

% 2 -> 3 (Dead to Decomposers)
\\draw[arrow=orange!60] (dead.south) to[bend left=30] (decomp.east);

% 3 -> 4 (Decomposers to Soil)
\\draw[arrow=yellow!60!black] (decomp.west) to[bend left=30] (soil.south);

% 4 -> 1 (Soil to Living)
\\draw[arrow=green!60!black] (soil.north) to[bend left=30] (living.west);

% Step numbers on arrows
\\node[num] at (6.2, 5.2) {1};
\\node[num] at (7.2, 1.5) {2};
\\node[num] at (1.8, 1.5) {3};
\\node[num] at (0.8, 5.2) {4};

% Bottom note
\\node[draw, thick, rounded corners=4pt, fill=green!10, font=\\footnotesize, align=center, inner sep=6pt] at (4, -0.8) {
  \\textbf{Decomposers} recycle nutrients back into the soil,\\\\
  helping new plants grow --- the cycle continues!
};
\\end{tikzpicture}`,
}
