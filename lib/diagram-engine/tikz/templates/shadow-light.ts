import type { TikzTemplate } from '../index'

export const SHADOW_LIGHT_TEMPLATE: TikzTemplate = {
  id: 'shadow-light',
  name: 'Shadows and Light',
  keywords: [
    'shadow', 'shadows',
    'light source', 'light and shadow',
    'shadow and light', 'shadow light',
    'shadow size', 'opaque transparent translucent',
    'opaque object', 'opaque',
    'how shadows form', 'light travels',
    'light rays',
  ],
  gradeRange: [1, 4],
  topics: [200],
  category: 'shadow-light',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  arrow/.style={-{Stealth[length=2.5mm,width=2mm]}, thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 6.5) {How Shadows Form};

% Light source (lamp/sun on left)
\\fill[yellow!60] (0.8, 3.5) circle (0.7);
\\draw[very thick, orange!70] (0.8, 3.5) circle (0.7);
\\node[font=\\scriptsize\\bfseries] at (0.8, 3.5) {Light};

% Sun rays emanating
\\draw[very thick, yellow!60] (1.55, 3.5) -- (2.0, 3.5);
\\draw[very thick, yellow!60] (1.4, 4.0) -- (1.8, 4.3);
\\draw[very thick, yellow!60] (1.4, 3.0) -- (1.8, 2.7);

% Light rays that hit the object (blocked)
\\draw[thick, yellow!50] (2.0, 3.5) -- (3.8, 3.5);
\\draw[thick, yellow!50] (1.8, 4.3) -- (3.8, 4.5);
\\draw[thick, yellow!50] (1.8, 2.7) -- (3.8, 2.5);

% Light rays that pass ABOVE the object
\\draw[thick, yellow!50, -{Stealth[length=2mm]}] (1.5, 4.2) -- (3.8, 5.2) -- (8.5, 5.5);
\\draw[thick, yellow!50, -{Stealth[length=2mm]}] (1.5, 4.5) -- (3.8, 5.5) -- (8.5, 6.0);

% Light rays that pass BELOW the object
\\draw[thick, yellow!50, -{Stealth[length=2mm]}] (1.5, 2.8) -- (3.8, 1.8) -- (8.5, 1.5);
\\draw[thick, yellow!50, -{Stealth[length=2mm]}] (1.5, 2.5) -- (3.8, 1.5) -- (8.5, 1.0);

% Opaque object (rectangle in middle)
\\fill[brown!60] (3.8, 2.5) rectangle (4.5, 4.5);
\\draw[very thick] (3.8, 2.5) rectangle (4.5, 4.5);

% Shadow zone (dark gray area behind object)
\\fill[gray!40] (4.5, 2.5) -- (8.5, 1.5) -- (8.5, 5.5) -- (4.5, 4.5) -- cycle;
\\draw[thick, gray!50, dashed] (4.5, 4.5) -- (8.5, 5.5);
\\draw[thick, gray!50, dashed] (4.5, 2.5) -- (8.5, 1.5);

% Screen/wall on right
\\fill[gray!15] (8.5, 0.5) rectangle (9, 6.5);
\\draw[very thick] (8.5, 0.5) -- (8.5, 6.5);

% Shadow on screen
\\fill[gray!60] (8.5, 1.5) rectangle (9, 5.5);

% Labels
% Light source label
\\node[label, orange!70] at (0.8, 2.2) {Light Source};

% Opaque object label
\\draw[arrow=brown!70] (4.15, 5.2) -- (4.15, 4.6);
\\node[label, brown!70] at (4.15, 5.5) {Opaque Object};

% Shadow label
\\node[label, gray!70] at (6.5, 3.5) {Shadow};
\\node[font=\\scriptsize, gray!60] at (6.5, 3.0) {(no light reaches here)};

% Screen label
\\node[label] at (9.4, 6.2) {Screen};

% Bottom explanation
\\node[draw, thick, rounded corners=4pt, fill=yellow!10, font=\\footnotesize, align=center, inner sep=6pt] at (5, -0.3) {
  \\textbf{Light travels in straight lines.}\\\\
  When an opaque object blocks the light, a shadow forms behind it.
};
\\end{tikzpicture}`,
}
