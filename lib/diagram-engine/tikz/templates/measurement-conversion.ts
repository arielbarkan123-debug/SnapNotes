import type { TikzTemplate } from '../index'

export const MEASUREMENT_CONVERSION_TEMPLATE: TikzTemplate = {
  id: 'measurement-conversion',
  name: 'Measurement Conversion',
  keywords: [
    'measurement conversion', 'convert units', 'inches to feet',
    'centimeters to meters', 'cups to gallons', 'unit conversion',
    'conversion chart', 'customary units', 'metric units',
    'measurement ladder', 'king henry',
  ],
  gradeRange: [3, 6],
  topics: [162, 163],
  category: 'measurement-conversion',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.0]
  % === TITLE ===
  \\node[font=\\normalsize\\bfseries] at (3.5,9.5) {Metric Conversion Staircase};
  % === STAIRCASE STEPS (bottom to top) ===
  % Step 1: mm (bottom-right)
  \\draw[very thick, fill=red!25] (6,0) rectangle (8,1);
  \\node[font=\\footnotesize\\bfseries] at (7,0.5) {mm};
  \\node[font=\\scriptsize, below=1pt] at (7,0) {millimeter};
  % Step 2: cm
  \\draw[very thick, fill=orange!25] (5,1.2) rectangle (7,2.2);
  \\node[font=\\footnotesize\\bfseries] at (6,1.7) {cm};
  \\node[font=\\scriptsize, below=1pt] at (6,1.2) {centimeter};
  % Step 3: dm
  \\draw[very thick, fill=yellow!30] (4,2.4) rectangle (6,3.4);
  \\node[font=\\footnotesize\\bfseries] at (5,2.9) {dm};
  \\node[font=\\scriptsize, below=1pt] at (5,2.4) {decimeter};
  % Step 4: m (center)
  \\draw[very thick, fill=green!25] (3,3.6) rectangle (5,4.6);
  \\node[font=\\footnotesize\\bfseries] at (4,4.1) {m};
  \\node[font=\\scriptsize, below=1pt] at (4,3.6) {meter};
  % Step 5: dam
  \\draw[very thick, fill=cyan!25] (2,4.8) rectangle (4,5.8);
  \\node[font=\\footnotesize\\bfseries] at (3,5.3) {dam};
  \\node[font=\\scriptsize, below=1pt] at (3,4.8) {dekameter};
  % Step 6: hm
  \\draw[very thick, fill=blue!20] (1,6.0) rectangle (3,7.0);
  \\node[font=\\footnotesize\\bfseries] at (2,6.5) {hm};
  \\node[font=\\scriptsize, below=1pt] at (2,6.0) {hectometer};
  % Step 7: km (top-left)
  \\draw[very thick, fill=violet!25] (0,7.2) rectangle (2,8.2);
  \\node[font=\\footnotesize\\bfseries] at (1,7.7) {km};
  \\node[font=\\scriptsize, below=1pt] at (1,7.2) {kilometer};
  % === ARROWS: multiply going down ===
  \\draw[very thick, red!60!black, -{Stealth[length=3mm]}] (8.5,7.5) -- (8.5,0.5);
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt, rotate=90] at (9.0,4.0) {Going DOWN: multiply by 10};
  % Small x10 labels on right side
  \\node[font=\\scriptsize\\bfseries, red!60!black] at (8.5,6.8) {$\\times$10};
  \\node[font=\\scriptsize\\bfseries, red!60!black] at (8.5,5.5) {$\\times$10};
  \\node[font=\\scriptsize\\bfseries, red!60!black] at (8.5,4.3) {$\\times$10};
  \\node[font=\\scriptsize\\bfseries, red!60!black] at (8.5,3.1) {$\\times$10};
  \\node[font=\\scriptsize\\bfseries, red!60!black] at (8.5,1.8) {$\\times$10};
  \\node[font=\\scriptsize\\bfseries, red!60!black] at (8.5,0.8) {$\\times$10};
  % === ARROWS: divide going up ===
  \\draw[very thick, blue!60!black, -{Stealth[length=3mm]}] (-0.8,0.5) -- (-0.8,7.5);
  \\node[font=\\scriptsize\\bfseries, fill=white, inner sep=2pt, rotate=90] at (-1.3,4.0) {Going UP: divide by 10};
  % Small /10 labels on left side
  \\node[font=\\scriptsize\\bfseries, blue!60!black] at (-0.8,1.0) {$\\div$10};
  \\node[font=\\scriptsize\\bfseries, blue!60!black] at (-0.8,2.2) {$\\div$10};
  \\node[font=\\scriptsize\\bfseries, blue!60!black] at (-0.8,3.4) {$\\div$10};
  \\node[font=\\scriptsize\\bfseries, blue!60!black] at (-0.8,4.8) {$\\div$10};
  \\node[font=\\scriptsize\\bfseries, blue!60!black] at (-0.8,6.0) {$\\div$10};
  \\node[font=\\scriptsize\\bfseries, blue!60!black] at (-0.8,7.2) {$\\div$10};
  % === MNEMONIC ===
  \\node[font=\\scriptsize, fill=yellow!15, draw=gray, rounded corners=3pt, inner sep=4pt, text width=7cm, align=center] at (3.5,-1.0) {\\textbf{King Henry Died Monday Drinking Chocolate Milk}\\\\km -- hm -- dam -- m -- dm -- cm -- mm};
\\end{tikzpicture}`,
}
