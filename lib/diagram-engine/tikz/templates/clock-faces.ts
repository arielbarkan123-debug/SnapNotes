import type { TikzTemplate } from '../index'

export const CLOCK_FACES_TEMPLATE: TikzTemplate = {
  id: 'clock-faces',
  name: 'Clock Faces',
  keywords: [
    'clock', 'clock face',
    'hour hand', 'minute hand', 'half hour', 'quarter hour',
    'o\'clock', 'what time',
    'half past', 'quarter past', 'quarter to',
  ],
  gradeRange: [1, 2],
  topics: [14, 25],
  category: 'clock-faces',
  referenceCode: `\\begin{tikzpicture}[scale=1.5]
  % Clock circle
  \\draw[very thick] (0,0) circle (2);
  % Hour marks
  \\foreach \\h in {1,...,12} {
    \\draw[thick] ({90-30*\\h}:1.8) -- ({90-30*\\h}:2.0);
  }
  % Hour numbers
  \\node[font=\\bfseries] at (90:1.55) {12};
  \\node[font=\\bfseries] at (60:1.55) {1};
  \\node[font=\\bfseries] at (30:1.55) {2};
  \\node[font=\\bfseries] at (0:1.55) {3};
  \\node[font=\\bfseries] at (-30:1.55) {4};
  \\node[font=\\bfseries] at (-60:1.55) {5};
  \\node[font=\\bfseries] at (-90:1.55) {6};
  \\node[font=\\bfseries] at (-120:1.55) {7};
  \\node[font=\\bfseries] at (-150:1.55) {8};
  \\node[font=\\bfseries] at (180:1.55) {9};
  \\node[font=\\bfseries] at (150:1.55) {10};
  \\node[font=\\bfseries] at (120:1.55) {11};
  % Center dot
  \\fill (0,0) circle (0.06);
  % Hour hand (pointing to 3) - short and thick
  \\draw[very thick, red!70!black] (0,0) -- (0:1.0);
  % Minute hand (pointing to 12) - long and thinner
  \\draw[thick, blue!70!black] (0,0) -- (90:1.5);
  % Time label
  \\node[below=0.4cm, font=\\large] at (0, -2) {3:00};
\\end{tikzpicture}`,
}
