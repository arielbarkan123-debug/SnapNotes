import type { TikzTemplate } from '../index'

export const ELAPSED_TIME_TEMPLATE: TikzTemplate = {
  id: 'elapsed-time',
  name: 'Elapsed Time',
  keywords: [
    'elapsed time', 'how much time passed', 'time interval',
    'telling time', 'read a clock', 'clock hands',
    'hours and minutes', 'what time is it', 'analog clock',
    'time difference',
  ],
  gradeRange: [1, 4],
  topics: [156, 157],
  category: 'elapsed-time',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.2]
  % === LEFT CLOCK (Start Time: 2:00) ===
  \\draw[very thick] (-4,0) circle (1.8);
  % Hour marks
  \\draw[thick] (-4,1.6) -- (-4,1.8);
  \\draw[thick] (-3.1,0.9) -- (-3.2,1.0);
  \\draw[thick] (-2.4,0) -- (-2.2,0);
  \\draw[thick] (-3.1,-0.9) -- (-3.2,-1.0);
  \\draw[thick] (-4,-1.6) -- (-4,-1.8);
  \\draw[thick] (-4.9,-0.9) -- (-4.8,-1.0);
  \\draw[thick] (-5.6,0) -- (-5.8,0);
  \\draw[thick] (-4.9,0.9) -- (-4.8,1.0);
  \\draw[thick] (-3.1,0.9) -- (-3.2,1.0);
  \\draw[thick] (-3.55,1.35) -- (-3.48,1.5);
  \\draw[thick] (-4.45,1.35) -- (-4.52,1.5);
  \\draw[thick] (-4.45,-1.35) -- (-4.52,-1.5);
  % Hour numbers
  \\node[font=\\footnotesize\\bfseries] at (-4,1.35) {12};
  \\node[font=\\footnotesize\\bfseries] at (-3.28,0.7) {1};
  \\node[font=\\footnotesize\\bfseries] at (-2.7,0) {3};
  \\node[font=\\footnotesize\\bfseries] at (-3.0,-0.05) {2};
  \\node[font=\\footnotesize\\bfseries] at (-3.28,-0.7) {4};
  \\node[font=\\footnotesize\\bfseries] at (-3.55,-1.1) {5};
  \\node[font=\\footnotesize\\bfseries] at (-4,-1.35) {6};
  \\node[font=\\footnotesize\\bfseries] at (-4.45,-1.1) {7};
  \\node[font=\\footnotesize\\bfseries] at (-4.72,-0.7) {8};
  \\node[font=\\footnotesize\\bfseries] at (-5.0,-0.05) {9};
  \\node[font=\\footnotesize\\bfseries] at (-4.72,0.7) {10};
  \\node[font=\\footnotesize\\bfseries] at (-4.45,1.1) {11};
  % Center dot
  \\fill (-4,0) circle (0.07);
  % Hour hand pointing to 2 (60 degrees from 12 = angle 30 from horizontal)
  \\draw[very thick, red!70!black] (-4,0) -- (-3.25,-0.2);
  % Minute hand pointing to 12
  \\draw[thick, blue!70!black] (-4,0) -- (-4,1.3);
  % Label
  \\node[below=0.5cm, font=\\footnotesize\\bfseries, fill=white, inner sep=2pt] at (-4,-1.8) {Start: 2:00};
  % === ARROW BETWEEN CLOCKS ===
  \\draw[very thick, green!50!black, -{Stealth[length=4mm]}] (-1.8,0) -- (0.8,0);
  \\node[above=4pt, font=\\footnotesize\\bfseries, fill=yellow!20, rounded corners=2pt, inner sep=4pt] at (-0.5,0) {2 hours 30 min};
  % === RIGHT CLOCK (End Time: 4:30) ===
  \\draw[very thick] (3,0) circle (1.8);
  % Hour marks
  \\draw[thick] (3,1.6) -- (3,1.8);
  \\draw[thick] (3.9,0.9) -- (3.8,1.0);
  \\draw[thick] (4.6,0) -- (4.8,0);
  \\draw[thick] (3.9,-0.9) -- (3.8,-1.0);
  \\draw[thick] (3,-1.6) -- (3,-1.8);
  \\draw[thick] (2.1,-0.9) -- (2.2,-1.0);
  \\draw[thick] (1.4,0) -- (1.2,0);
  \\draw[thick] (2.1,0.9) -- (2.2,1.0);
  \\draw[thick] (3.45,1.35) -- (3.48,1.5);
  \\draw[thick] (2.55,1.35) -- (2.52,1.5);
  \\draw[thick] (3.45,-1.35) -- (3.48,-1.5);
  \\draw[thick] (2.55,-1.35) -- (2.52,-1.5);
  % Hour numbers
  \\node[font=\\footnotesize\\bfseries] at (3,1.35) {12};
  \\node[font=\\footnotesize\\bfseries] at (3.72,0.7) {1};
  \\node[font=\\footnotesize\\bfseries] at (4.0,-0.05) {2};
  \\node[font=\\footnotesize\\bfseries] at (4.3,0) {3};
  \\node[font=\\footnotesize\\bfseries] at (3.72,-0.7) {4};
  \\node[font=\\footnotesize\\bfseries] at (3.45,-1.1) {5};
  \\node[font=\\footnotesize\\bfseries] at (3,-1.35) {6};
  \\node[font=\\footnotesize\\bfseries] at (2.55,-1.1) {7};
  \\node[font=\\footnotesize\\bfseries] at (2.28,-0.7) {8};
  \\node[font=\\footnotesize\\bfseries] at (2.0,-0.05) {9};
  \\node[font=\\footnotesize\\bfseries] at (2.28,0.7) {10};
  \\node[font=\\footnotesize\\bfseries] at (2.55,1.1) {11};
  % Center dot
  \\fill (3,0) circle (0.07);
  % Hour hand pointing between 4 and 5 (4:30)
  \\draw[very thick, red!70!black] (3,0) -- (3.35,-0.95);
  % Minute hand pointing to 6 (30 minutes)
  \\draw[thick, blue!70!black] (3,0) -- (3,-1.3);
  % Label
  \\node[below=0.5cm, font=\\footnotesize\\bfseries, fill=white, inner sep=2pt] at (3,-1.8) {End: 4:30};
  % Title
  \\node[above=0.3cm, font=\\normalsize\\bfseries] at (-0.5,2.2) {Elapsed Time};
\\end{tikzpicture}`,
}
