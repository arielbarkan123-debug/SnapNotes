import type { TikzTemplate } from '../index'

export const LETTER_FORMAT_TEMPLATE: TikzTemplate = {
  id: 'letter-format',
  name: 'Letter Format',
  keywords: [
    'friendly letter', 'letter format',
    'parts of a letter', 'letter writing',
    'greeting body closing', 'heading date',
    'dear friend letter', 'letter parts',
  ],
  gradeRange: [2, 5],
  topics: [217],
  category: 'letter-format',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.3,
  label/.style={font=\\scriptsize\\bfseries, fill=white, inner sep=2pt},
  brace/.style={very thick, #1, decorate, decoration={brace, amplitude=5pt}}
]
% Title
\\node[font=\\large\\bfseries] at (5, 10.5) {Parts of a Friendly Letter};

% Paper background
\\draw[thick, fill=yellow!5] (1, 0.5) rectangle (9, 9.5);
% Paper lines
\\draw[thin, gray!20] (1.5, 8.8) -- (8.5, 8.8);
\\draw[thin, gray!20] (1.5, 8.0) -- (8.5, 8.0);
\\draw[thin, gray!20] (1.5, 7.2) -- (8.5, 7.2);
\\draw[thin, gray!20] (1.5, 6.4) -- (8.5, 6.4);
\\draw[thin, gray!20] (1.5, 5.6) -- (8.5, 5.6);
\\draw[thin, gray!20] (1.5, 4.8) -- (8.5, 4.8);
\\draw[thin, gray!20] (1.5, 4.0) -- (8.5, 4.0);
\\draw[thin, gray!20] (1.5, 3.2) -- (8.5, 3.2);
\\draw[thin, gray!20] (1.5, 2.4) -- (8.5, 2.4);
\\draw[thin, gray!20] (1.5, 1.6) -- (8.5, 1.6);

% 1) Date (top right)
\\node[font=\\scriptsize, anchor=east] at (8.3, 9.0) {October 5, 2025};
\\draw[brace=red!60] (9.2, 9.3) -- (9.2, 8.7);
\\node[label, red!70, anchor=west] at (9.5, 9.0) {Date};
\\node[circle, fill=red!60, text=white, font=\\scriptsize\\bfseries, inner sep=1.5pt] at (9.5, 9.5) {1};

% 2) Greeting (left aligned)
\\node[font=\\scriptsize, anchor=west] at (1.8, 8.0) {Dear Sam,};
\\draw[brace=blue!60] (0.7, 8.3) -- (0.7, 7.7);
\\node[label, blue!70, anchor=east] at (0.5, 8.0) {Greeting};
\\node[circle, fill=blue!60, text=white, font=\\scriptsize\\bfseries, inner sep=1.5pt] at (0.5, 8.5) {2};

% 3) Body (middle section with wavy lines)
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.5mm, segment length=3mm}] (1.8, 7.2) -- (8.0, 7.2);
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.5mm, segment length=3mm}] (1.8, 6.4) -- (8.0, 6.4);
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.5mm, segment length=3mm}] (1.8, 5.6) -- (8.0, 5.6);
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.5mm, segment length=3mm}] (1.8, 4.8) -- (7.0, 4.8);
\\draw[brace=green!50!black] (0.7, 7.5) -- (0.7, 4.5);
\\node[label, green!50!black, anchor=east] at (0.5, 6.0) {Body};
\\node[circle, fill=green!50!black, text=white, font=\\scriptsize\\bfseries, inner sep=1.5pt] at (0.5, 7.0) {3};

% 4) Closing
\\node[font=\\scriptsize, anchor=west] at (1.8, 3.2) {Your friend,};
\\draw[brace=orange!70] (9.2, 3.5) -- (9.2, 2.9);
\\node[label, orange!70, anchor=west] at (9.5, 3.2) {Closing};
\\node[circle, fill=orange!70, text=white, font=\\scriptsize\\bfseries, inner sep=1.5pt] at (9.5, 3.7) {4};

% 5) Signature
\\node[font=\\scriptsize\\itshape, anchor=west] at (1.8, 2.4) {Alex};
\\draw[brace=purple!70] (9.2, 2.7) -- (9.2, 2.1);
\\node[label, purple!70, anchor=west] at (9.5, 2.4) {Signature};
\\node[circle, fill=purple!70, text=white, font=\\scriptsize\\bfseries, inner sep=1.5pt] at (9.5, 2.9) {5};
\\end{tikzpicture}`,
}
