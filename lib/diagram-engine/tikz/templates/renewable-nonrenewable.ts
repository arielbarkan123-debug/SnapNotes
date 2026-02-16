import type { TikzTemplate } from '../index'

export const RENEWABLE_NONRENEWABLE_TEMPLATE: TikzTemplate = {
  id: 'renewable-nonrenewable',
  name: 'Renewable vs Nonrenewable Energy',
  keywords: [
    'renewable energy', 'nonrenewable energy', 'renewable resources',
    'nonrenewable resources', 'solar energy', 'wind energy',
    'fossil fuels', 'coal oil gas', 'energy sources',
    'natural resources renewable',
  ],
  gradeRange: [3, 6],
  topics: [190, 191],
  category: 'earth-science',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.2,
  box/.style={draw, thick, rounded corners=5pt, fill=#1, minimum width=2.8cm, minimum height=1cm, align=center, font=\\footnotesize\\bfseries},
  header/.style={draw, very thick, rounded corners=8pt, fill=#1, minimum width=3.6cm, minimum height=1.1cm, align=center, font=\\footnotesize\\bfseries},
  iconbox/.style={draw, thick, circle, fill=#1, minimum size=0.7cm, font=\\scriptsize\\bfseries},
  desc/.style={font=\\scriptsize, gray, align=center}
]
% Title
\\node[font=\\large\\bfseries] at (5, 9.5) {Energy Sources};
\\node[font=\\scriptsize, gray] at (5, 9.0) {Renewable vs. Nonrenewable};

% Dividing line
\\draw[very thick, dashed, gray!40] (5, 0.8) -- (5, 8.5);

% === LEFT: Renewable ===
\\node[header=green!25] at (2.3, 8.2) {Renewable};
\\node[desc] at (2.3, 7.5) {Can be replaced\\\\naturally over time};

% Solar
\\node[iconbox=yellow!40] (sunicon) at (0.7, 6.3) {};
\\node[box=yellow!15] (solar) at (2.8, 6.3) {Solar};
\\node[desc] at (2.8, 5.6) {Energy from the sun};

% Wind
\\node[iconbox=blue!20] (windicon) at (0.7, 4.6) {};
\\node[box=blue!10] (wind) at (2.8, 4.6) {Wind};
\\node[desc] at (2.8, 3.9) {Wind turns turbines};

% Water/Hydro
\\node[iconbox=blue!40] (watericon) at (0.7, 2.9) {};
\\node[box=cyan!15] (hydro) at (2.8, 2.9) {Water (Hydro)};
\\node[desc] at (2.8, 2.2) {Flowing water power};

% Biomass
\\node[iconbox=green!30] (bioicon) at (0.7, 1.2) {};
\\node[box=green!10] (bio) at (2.8, 1.2) {Biomass};
\\node[desc] at (2.8, 0.5) {Plants and organic matter};

% Sun rays on icon
\\draw[thick, yellow!70!orange] (0.7, 6.6) -- (0.7, 6.85);
\\draw[thick, yellow!70!orange] (0.95, 6.55) -- (1.1, 6.7);
\\draw[thick, yellow!70!orange] (0.45, 6.55) -- (0.3, 6.7);
\\draw[thick, yellow!70!orange] (0.95, 6.05) -- (1.1, 5.9);
\\draw[thick, yellow!70!orange] (0.45, 6.05) -- (0.3, 5.9);

% === RIGHT: Nonrenewable ===
\\node[header=red!25] at (7.7, 8.2) {Nonrenewable};
\\node[desc] at (7.7, 7.5) {Limited supply,\\\\takes millions of years};

% Coal
\\node[iconbox=black!60, text=white] (coalicon) at (6.2, 6.3) {};
\\node[box=gray!20] (coal) at (8.2, 6.3) {Coal};
\\node[desc] at (8.2, 5.6) {Mined from the ground};

% Oil
\\node[iconbox=black!40] (oilicon) at (6.2, 4.6) {};
\\node[box=gray!15] (oil) at (8.2, 4.6) {Oil (Petroleum)};
\\node[desc] at (8.2, 3.9) {Drilled underground};

% Natural Gas
\\node[iconbox=orange!40] (gasicon) at (6.2, 2.9) {};
\\node[box=orange!10] (gas) at (8.2, 2.9) {Natural Gas};
\\node[desc] at (8.2, 2.2) {Burned for heat};

% Flame on gas icon
\\draw[thick, orange!70] (6.1, 3.15) -- (6.2, 3.35) -- (6.3, 3.15);

% Comparison arrow in center
\\draw[very thick, {Stealth[length=2.5mm]}-{Stealth[length=2.5mm]}, gray!50] (4.6, 4.5) -- (5.4, 4.5);
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt] at (5.0, 4.5) {vs};

% Bottom note
\\node[draw, thick, rounded corners=5pt, fill=green!8, font=\\scriptsize\\bfseries, align=center, minimum width=8cm] at (5, -0.2) {Renewable = replaced naturally \\quad | \\quad Nonrenewable = limited, running out};

% Checkmark for renewable
\\node[font=\\footnotesize, green!50!black] at (2.3, 0.0) {Lasts forever!};
% X for nonrenewable
\\node[font=\\footnotesize, red!60] at (7.7, 0.8) {Running out!};
\\end{tikzpicture}`,
}
