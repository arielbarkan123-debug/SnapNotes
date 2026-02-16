import type { TikzTemplate } from '../index'

export const DAY_NIGHT_ROTATION_TEMPLATE: TikzTemplate = {
  id: 'day-night-rotation',
  name: 'Day and Night / Earth Rotation',
  keywords: [
    'day and night', 'earth rotation',
    'why day and night', 'earth spins',
    'rotation earth', 'daytime nighttime',
    '24 hours', 'sunrise sunset',
  ],
  gradeRange: [2, 4],
  topics: [196],
  category: 'day-night-rotation',
  referenceCode: `\\usetikzlibrary{arrows.meta, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.4,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 6.5) {Day and Night};

% Sun on the left
\\fill[yellow!60] (0.8, 3.5) circle (1);
\\draw[very thick, orange!70] (0.8, 3.5) circle (1);
\\node[font=\\footnotesize\\bfseries] at (0.8, 3.5) {Sun};

% Sun rays
\\draw[very thick, yellow!70] (1.9, 3.5) -- (2.6, 3.5);
\\draw[very thick, yellow!70] (1.7, 4.3) -- (2.3, 4.8);
\\draw[very thick, yellow!70] (1.7, 2.7) -- (2.3, 2.2);
\\draw[very thick, yellow!70] (1.8, 4.0) -- (2.5, 4.3);
\\draw[very thick, yellow!70] (1.8, 3.0) -- (2.5, 2.7);

% Light rays reaching Earth
\\draw[thick, yellow!50, dashed] (2.6, 3.5) -- (3.8, 3.5);
\\draw[thick, yellow!50, dashed] (2.5, 4.3) -- (3.9, 4.2);
\\draw[thick, yellow!50, dashed] (2.5, 2.7) -- (3.9, 2.8);

% Earth circle
\\fill[blue!15] (5.5, 3.5) circle (1.8);
\\draw[very thick] (5.5, 3.5) circle (1.8);

% Day half (left side facing sun) - yellow fill
\\begin{scope}
  \\clip (5.5, 3.5) circle (1.8);
  \\fill[yellow!30] (3.7, 1.5) rectangle (5.5, 5.5);
\\end{scope}

% Night half (right side away from sun) - dark blue fill
\\begin{scope}
  \\clip (5.5, 3.5) circle (1.8);
  \\fill[blue!50!black!40] (5.5, 1.5) rectangle (7.5, 5.5);
\\end{scope}

% Redraw Earth outline
\\draw[very thick] (5.5, 3.5) circle (1.8);

% Dividing line (terminator)
\\draw[thick, dashed, gray] (5.5, 1.7) -- (5.5, 5.3);

% Day label
\\node[font=\\footnotesize\\bfseries, fill=yellow!20, inner sep=2pt, rounded corners=2pt] at (4.6, 3.5) {Day};

% Night label
\\node[font=\\footnotesize\\bfseries, text=white] at (6.4, 3.5) {Night};

% Small stars on night side
\\node[font=\\tiny, text=white] at (6.6, 4.3) {*};
\\node[font=\\tiny, text=white] at (6.8, 3.0) {*};
\\node[font=\\tiny, text=white] at (6.2, 4.6) {*};

% Stick figure on day side
\\draw[thick] (4.3, 5.1) circle (0.12);
\\draw[thick] (4.3, 5.0) -- (4.3, 4.6);
\\draw[thick] (4.3, 4.9) -- (4.1, 4.7);
\\draw[thick] (4.3, 4.9) -- (4.5, 4.7);
\\draw[thick] (4.3, 4.6) -- (4.15, 4.3);
\\draw[thick] (4.3, 4.6) -- (4.45, 4.3);

% Rotation arrow (curved arrow around Earth)
\\draw[arrow=green!50!black, line width=1.2pt] (5.5, 5.6) arc (90:410:0.4 and 0.3);
\\node[font=\\scriptsize\\bfseries, green!50!black, above] at (5.5, 5.8) {Rotation};

% Axis line (tilted)
\\draw[thick, dashed, gray!60] (5.5, 1.2) -- (5.5, 5.8);
\\node[font=\\scriptsize, gray!60] at (5.5, 0.9) {Axis};

% Bottom explanation
\\node[draw, thick, rounded corners=4pt, fill=yellow!10, font=\\footnotesize, align=center, inner sep=6pt] at (5, 0.3) {
  \\textbf{Earth rotates once every 24 hours.}\\\\
  The side facing the Sun has daytime.
};
\\end{tikzpicture}`,
}
