import type { TikzTemplate } from '../index'

export const MUSICAL_STAFF_TEMPLATE: TikzTemplate = {
  id: 'musical-staff',
  name: 'Musical Staff and Notes',
  keywords: [
    'musical staff', 'music staff',
    'treble clef', 'bass clef',
    'musical notes', 'music notes',
    'whole note half note quarter note',
    'rhythm pattern', 'rhythm patterns',
    'note values', 'music reading',
    'instrument families', 'musical instruments',
  ],
  gradeRange: [2, 6],
  topics: [147, 148, 150],
  category: 'musical-staff',
  referenceCode: `\\begin{tikzpicture}[scale=1.2]
% Title
\\node[font=\\large\\bfseries] at (7, 5) {Musical Staff and Notes};

% Staff lines (5 lines)
\\foreach \\y in {0, 0.5, 1, 1.5, 2} {
  \\draw[thick] (0, \\y) -- (14, \\y);
}

% Treble clef (simplified representation)
\\node[font=\\Huge] at (0.8, 1) {\\&};
\\node[font=\\scriptsize\\bfseries, below] at (0.8, -0.5) {Treble Clef};

% Note values displayed on staff
% Whole note (4 beats) - open oval
\\draw[thick] (3, 1) ellipse (0.25 and 0.2);
\\node[font=\\scriptsize\\bfseries, below=0.4cm] at (3, -0.3) {Whole};
\\node[font=\\scriptsize, gray, below] at (3, -0.8) {4 beats};

% Half note (2 beats) - open oval with stem
\\draw[thick] (5.5, 1.5) ellipse (0.25 and 0.2);
\\draw[thick] (5.75, 1.5) -- (5.75, 3);
\\node[font=\\scriptsize\\bfseries, below=0.4cm] at (5.5, -0.3) {Half};
\\node[font=\\scriptsize, gray, below] at (5.5, -0.8) {2 beats};

% Quarter note (1 beat) - filled oval with stem
\\fill[black] (8, 1) ellipse (0.25 and 0.2);
\\draw[thick] (8.25, 1) -- (8.25, 2.5);
\\node[font=\\scriptsize\\bfseries, below=0.4cm] at (8, -0.3) {Quarter};
\\node[font=\\scriptsize, gray, below] at (8, -0.8) {1 beat};

% Eighth note (1/2 beat) - filled oval with stem and flag
\\fill[black] (10.5, 0.5) ellipse (0.25 and 0.2);
\\draw[thick] (10.75, 0.5) -- (10.75, 2.5);
\\draw[thick] (10.75, 2.5) .. controls (11.2, 2) and (11.2, 1.5) .. (10.75, 1.5);
\\node[font=\\scriptsize\\bfseries, below=0.4cm] at (10.5, -0.3) {Eighth};
\\node[font=\\scriptsize, gray, below] at (10.5, -0.8) {1/2 beat};

% Sixteenth note
\\fill[black] (13, 1.5) ellipse (0.25 and 0.2);
\\draw[thick] (13.25, 1.5) -- (13.25, 3.5);
\\draw[thick] (13.25, 3.5) .. controls (13.7, 3) and (13.7, 2.5) .. (13.25, 2.5);
\\draw[thick] (13.25, 3) .. controls (13.7, 2.5) and (13.7, 2) .. (13.25, 2);
\\node[font=\\scriptsize\\bfseries, below=0.4cm] at (13, -0.3) {Sixteenth};
\\node[font=\\scriptsize, gray, below] at (13, -0.8) {1/4 beat};

% Line names (EGBDF)
\\node[font=\\tiny, gray, right] at (14.2, 0) {E};
\\node[font=\\tiny, gray, right] at (14.2, 0.5) {G};
\\node[font=\\tiny, gray, right] at (14.2, 1) {B};
\\node[font=\\tiny, gray, right] at (14.2, 1.5) {D};
\\node[font=\\tiny, gray, right] at (14.2, 2) {F};
\\end{tikzpicture}`,
}
