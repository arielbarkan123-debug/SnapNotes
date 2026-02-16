import type { TikzTemplate } from '../index'

export const FOSSIL_FORMATION_TEMPLATE: TikzTemplate = {
  id: 'fossil-formation',
  name: 'Fossil Formation',
  keywords: [
    'fossil', 'fossils', 'fossil formation',
    'how fossils form', 'types of fossils', 'fossilization',
    'fossil record', 'imprint fossil', 'cast fossil',
    'mold fossil', 'petrified',
  ],
  gradeRange: [3, 5],
  topics: [188, 189],
  category: 'earth-science',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.2,
  step/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=3.4cm, minimum height=2.8cm, align=center},
  arrow/.style={-{Stealth[length=3mm,width=2.5mm]}, very thick, blue!60},
  steplbl/.style={font=\\footnotesize\\bfseries, align=center},
  desc/.style={font=\\scriptsize, gray, align=center}
]
% Title
\\node[font=\\large\\bfseries] at (7, 9.5) {How Fossils Form};
\\node[font=\\scriptsize, gray] at (7, 9.0) {A process that takes millions of years};

% === Step 1: Animal dies near water ===
\\node[step=blue!8] (s1) at (1.8, 6.5) {};
\\node[circle, fill=blue!50, text=white, font=\\footnotesize\\bfseries, inner sep=3pt] at (0.3, 8.0) {1};
\\node[steplbl] at (1.8, 8.0) {Animal Dies\\\\Near Water};
% Simple fish shape
\\draw[very thick, fill=orange!30] (1.0, 6.8) -- (2.0, 7.2) -- (2.6, 6.8) -- (2.6, 6.2) -- (2.0, 5.8) -- (1.0, 6.2) -- cycle;
% Tail
\\draw[very thick, fill=orange!30] (2.6, 6.5) -- (3.1, 7.0) -- (3.1, 6.0) -- cycle;
% Eye
\\fill[black] (1.3, 6.7) circle (0.08);
% Water below
\\draw[thick, blue!40, decorate, decoration={snake, amplitude=1mm, segment length=5mm}] (0.2, 5.3) -- (3.4, 5.3);
\\node[desc] at (1.8, 4.9) {Fish dies and sinks\\\\to the bottom};

% Arrow 1->2
\\draw[arrow] (3.6, 6.5) -- (4.8, 6.5);

% === Step 2: Buried by sediment ===
\\node[step=yellow!10] (s2) at (6.6, 6.5) {};
\\node[circle, fill=blue!50, text=white, font=\\footnotesize\\bfseries, inner sep=3pt] at (5.1, 8.0) {2};
\\node[steplbl] at (6.6, 8.0) {Buried by\\\\Sediment};
% Sediment layers covering fish
\\fill[brown!20] (5.0, 5.0) rectangle (8.2, 5.8);
\\fill[brown!30] (5.0, 5.8) rectangle (8.2, 6.4);
\\fill[brown!40] (5.0, 6.4) rectangle (8.2, 7.0);
\\fill[brown!50] (5.0, 7.0) rectangle (8.2, 7.6);
% Fish outline visible in layer
\\draw[thick, orange!60] (5.8, 5.8) -- (6.4, 6.1) -- (7.0, 5.8) -- (7.0, 5.5) -- (6.4, 5.2) -- (5.8, 5.5) -- cycle;
\\node[desc] at (6.6, 4.9) {Layers of mud and\\\\sand cover the body};

% Arrow 2->3
\\draw[arrow] (8.4, 6.5) -- (9.6, 6.5);

% === Step 3: Minerals replace bones ===
\\node[step=orange!8] (s3) at (11.4, 6.5) {};
\\node[circle, fill=blue!50, text=white, font=\\footnotesize\\bfseries, inner sep=3pt] at (9.9, 8.0) {3};
\\node[steplbl] at (11.4, 8.0) {Minerals Replace\\\\Bones Over Time};
% Dotted fish outline (mineralized)
\\draw[very thick, dashed, brown!60] (10.2, 6.8) -- (11.0, 7.1) -- (11.8, 6.8) -- (11.8, 6.2) -- (11.0, 5.9) -- (10.2, 6.2) -- cycle;
\\draw[very thick, dashed, brown!60] (11.8, 6.5) -- (12.3, 7.0) -- (12.3, 6.0) -- cycle;
% Mineral dots
\\fill[brown!50] (10.6, 6.6) circle (0.06);
\\fill[brown!50] (11.0, 6.5) circle (0.06);
\\fill[brown!50] (11.4, 6.7) circle (0.06);
\\fill[brown!50] (10.8, 6.2) circle (0.06);
\\fill[brown!50] (11.2, 6.3) circle (0.06);
\\fill[brown!50] (11.6, 6.4) circle (0.06);
% Surrounding rock
\\fill[gray!20] (9.8, 5.0) rectangle (13.0, 5.6);
\\fill[gray!30] (9.8, 7.4) rectangle (13.0, 8.0);
\\node[desc] at (11.4, 4.9) {Bones slowly turn\\\\to stone (rock)};

% Arrow 3->4 (goes down)
\\draw[arrow] (11.4, 4.3) -- (11.4, 3.2);

% === Step 4: Erosion reveals fossil ===
\\node[step=green!8] (s4) at (6.6, 1.2) {};
\\node[circle, fill=blue!50, text=white, font=\\footnotesize\\bfseries, inner sep=3pt] at (5.1, 2.8) {4};
\\node[steplbl] at (6.6, 2.8) {Erosion Reveals\\\\the Fossil};
% Surface with exposed fossil
\\fill[green!15] (5.0, 1.8) rectangle (8.2, 2.5);
\\fill[brown!25] (5.0, 0.2) rectangle (8.2, 1.8);
% Fossil exposed at surface
\\draw[very thick, fill=brown!40] (5.8, 1.5) -- (6.4, 1.8) -- (7.0, 1.5) -- (7.0, 1.1) -- (6.4, 0.8) -- (5.8, 1.1) -- cycle;
\\draw[very thick, fill=brown!40] (7.0, 1.3) -- (7.5, 1.7) -- (7.5, 0.9) -- cycle;
\\fill[brown!60] (6.1, 1.4) circle (0.06);
% Erosion arrows
\\draw[thick, -{Stealth[length=2mm]}, red!40] (5.6, 2.3) -- (5.0, 2.0);
\\draw[thick, -{Stealth[length=2mm]}, red!40] (8.0, 2.3) -- (8.4, 2.0);
\\node[desc] at (6.6, -0.2) {Wind and rain wear away\\\\rock, exposing the fossil};

% Time arrow at bottom
\\draw[very thick, -{Stealth[length=3mm]}, gray!60] (1.0, -0.8) -- (12.0, -0.8);
\\node[font=\\scriptsize\\bfseries, gray] at (6.5, -1.2) {Millions of Years};
\\end{tikzpicture}`,
}
