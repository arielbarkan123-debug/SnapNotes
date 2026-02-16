import type { TikzTemplate } from '../index'

export const PROBABILITY_ELEMENTARY_TEMPLATE: TikzTemplate = {
  id: 'probability-elementary',
  name: 'Probability (Elementary)',
  keywords: [
    'probability spinner', 'spinner', 'probability dice',
    'dice probability', 'coin flip probability', 'likely unlikely',
    'certain impossible', 'chance', 'probability of',
    'fair unfair', 'outcomes',
  ],
  gradeRange: [3, 6],
  topics: [158, 159],
  category: 'probability-elementary',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.3]
  % === SPINNER ===
  % Red section (0 to 90 degrees)
  \\fill[red!40] (0,0) -- (0:2) arc (0:90:2) -- cycle;
  % Blue section (90 to 180 degrees)
  \\fill[blue!40] (0,0) -- (90:2) arc (90:180:2) -- cycle;
  % Green section (180 to 270 degrees)
  \\fill[green!40] (0,0) -- (180:2) arc (180:270:2) -- cycle;
  % Yellow section (270 to 360 degrees)
  \\fill[yellow!50] (0,0) -- (270:2) arc (270:360:2) -- cycle;
  % Circle outline
  \\draw[very thick] (0,0) circle (2);
  % Dividing lines
  \\draw[thick] (0,-2) -- (0,2);
  \\draw[thick] (-2,0) -- (2,0);
  % Section labels
  \\node[font=\\footnotesize\\bfseries] at (45:1.2) {Red};
  \\node[font=\\footnotesize\\bfseries] at (135:1.2) {Blue};
  \\node[font=\\footnotesize\\bfseries] at (225:1.2) {Green};
  \\node[font=\\footnotesize\\bfseries] at (315:1.2) {Yellow};
  % Fraction labels
  \\node[font=\\scriptsize, fill=white, inner sep=1pt, rounded corners=1pt] at (45:1.65) {1/4};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt, rounded corners=1pt] at (135:1.65) {1/4};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt, rounded corners=1pt] at (225:1.65) {1/4};
  \\node[font=\\scriptsize, fill=white, inner sep=1pt, rounded corners=1pt] at (315:1.65) {1/4};
  % Spinner arrow pointing to ~60 degrees
  \\draw[very thick, black, -{Stealth[length=3mm]}] (0,0) -- (60:1.6);
  % Center dot
  \\fill[black] (0,0) circle (0.1);
  % Title
  \\node[above=0.3cm, font=\\normalsize\\bfseries] at (0,2) {Probability Spinner};
  % === PROBABILITY SCALE ===
  \\draw[very thick] (-3.5,-3.5) -- (3.5,-3.5);
  % End marks
  \\draw[thick] (-3.5,-3.3) -- (-3.5,-3.7);
  \\draw[thick] (3.5,-3.3) -- (3.5,-3.7);
  % Middle marks
  \\draw[thick] (-1.75,-3.35) -- (-1.75,-3.65);
  \\draw[thick] (0,-3.35) -- (0,-3.65);
  \\draw[thick] (1.75,-3.35) -- (1.75,-3.65);
  % Labels
  \\node[below=5pt, font=\\scriptsize\\bfseries, text=red!70!black] at (-3.5,-3.7) {Impossible};
  \\node[below=5pt, font=\\scriptsize\\bfseries, text=orange!70!black] at (-1.75,-3.7) {Unlikely};
  \\node[below=5pt, font=\\scriptsize\\bfseries, text=yellow!50!black] at (0,-3.7) {Equally};
  \\node[below=12pt, font=\\scriptsize\\bfseries, text=yellow!50!black] at (0,-3.7) {Likely};
  \\node[below=5pt, font=\\scriptsize\\bfseries, text=blue!70!black] at (1.75,-3.7) {Likely};
  \\node[below=5pt, font=\\scriptsize\\bfseries, text=green!50!black] at (3.5,-3.7) {Certain};
  % Fraction labels on scale
  \\node[above=5pt, font=\\scriptsize] at (-3.5,-3.3) {0};
  \\node[above=5pt, font=\\scriptsize] at (0,-3.3) {1/2};
  \\node[above=5pt, font=\\scriptsize] at (3.5,-3.3) {1};
  % Pointer for spinner probability on scale
  \\fill[red!60] (0,-3.5) circle (0.12);
  \\node[above=10pt, font=\\scriptsize, fill=white, inner sep=1pt] at (0,-3.0) {P(Red) = 1/4};
  % Scale title
  \\node[font=\\footnotesize\\bfseries] at (0,-2.8) {Probability Scale};
\\end{tikzpicture}`,
}
