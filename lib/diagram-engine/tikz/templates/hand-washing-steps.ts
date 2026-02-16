import type { TikzTemplate } from '../index'

export const HAND_WASHING_STEPS_TEMPLATE: TikzTemplate = {
  id: 'hand-washing-steps',
  name: 'Hand Washing Steps',
  keywords: [
    'hand washing', 'wash hands',
    'hand washing steps', 'hygiene',
    'germ prevention', 'clean hands',
    'soap and water', 'when to wash hands',
    'healthy habits',
  ],
  gradeRange: [1, 3],
  topics: [222],
  category: 'hand-washing-steps',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.2,
  stepbox/.style={draw, very thick, rounded corners=8pt, fill=#1, minimum width=2.8cm, minimum height=2cm, align=center},
  stepnum/.style={circle, fill=#1, text=white, font=\\footnotesize\\bfseries, inner sep=2pt},
  steplabel/.style={font=\\scriptsize\\bfseries, #1},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, gray!50}
]
% Title
\\node[font=\\large\\bfseries] at (5, 8.5) {How to Wash Your Hands};

% Row 1: Steps 1-3
% Step 1 -- Wet hands
\\node[stepbox=blue!12] (s1) at (1.8, 6) {};
\\node[stepnum=blue!60] at (0.6, 7.0) {1};
\\node[steplabel=blue!70] at (1.8, 6.5) {Wet Hands};
% Water drops
\\draw[thick, blue!60] (1.4, 5.6) -- (1.3, 5.2);
\\draw[thick, blue!60] (1.8, 5.6) -- (1.8, 5.1);
\\draw[thick, blue!60] (2.2, 5.6) -- (2.3, 5.2);

% Step 2 -- Add soap
\\node[stepbox=green!12] (s2) at (5, 6) {};
\\node[stepnum=green!50!black] at (3.8, 7.0) {2};
\\node[steplabel=green!50!black] at (5, 6.5) {Add Soap};
% Bubble circles
\\draw[thick, green!40] (4.6, 5.7) circle (0.15);
\\draw[thick, green!40] (5.0, 5.4) circle (0.2);
\\draw[thick, green!40] (5.4, 5.6) circle (0.12);
\\draw[thick, green!40] (5.2, 5.9) circle (0.1);

% Step 3 -- Scrub 20 seconds
\\node[stepbox=orange!12] (s3) at (8.2, 6) {};
\\node[stepnum=orange!60] at (7.0, 7.0) {3};
\\node[steplabel=orange!70] at (8.2, 6.5) {Scrub 20 sec};
% Clock icon
\\draw[thick, orange!60] (8.2, 5.5) circle (0.35);
\\draw[thick, orange!60] (8.2, 5.5) -- (8.2, 5.8);
\\draw[thick, orange!60] (8.2, 5.5) -- (8.4, 5.5);

% Arrows row 1
\\draw[arrow] (3.2, 6) -- (3.6, 6);
\\draw[arrow] (6.4, 6) -- (6.8, 6);

% Row 2: Steps 4-6
% Step 4 -- Between fingers
\\node[stepbox=purple!12] (s4) at (1.8, 2.8) {};
\\node[stepnum=purple!60] at (0.6, 3.8) {4};
\\node[steplabel=purple!70] at (1.8, 3.3) {Between Fingers};
% Scrub lines
\\draw[thick, purple!40] (1.3, 2.5) -- (1.6, 2.2);
\\draw[thick, purple!40] (1.7, 2.5) -- (2.0, 2.2);
\\draw[thick, purple!40] (2.1, 2.5) -- (2.4, 2.2);

% Step 5 -- Rinse
\\node[stepbox=cyan!12] (s5) at (5, 2.8) {};
\\node[stepnum=cyan!60] at (3.8, 3.8) {5};
\\node[steplabel=cyan!70] at (5, 3.3) {Rinse};
% Water drops
\\draw[thick, cyan!60] (4.6, 2.5) -- (4.5, 2.1);
\\draw[thick, cyan!60] (5.0, 2.5) -- (5.0, 2.0);
\\draw[thick, cyan!60] (5.4, 2.5) -- (5.5, 2.1);

% Step 6 -- Dry hands
\\node[stepbox=yellow!15] (s6) at (8.2, 2.8) {};
\\node[stepnum=yellow!60!orange] at (7.0, 3.8) {6};
\\node[steplabel=yellow!60!orange] at (8.2, 3.3) {Dry Hands};
% Towel shape
\\draw[very thick, yellow!50!orange, rounded corners=2pt] (7.8, 2.6) rectangle (8.6, 2.2);
\\draw[thick, yellow!50!orange] (7.9, 2.4) -- (8.5, 2.4);

% Arrows row 2
\\draw[arrow] (3.2, 2.8) -- (3.6, 2.8);
\\draw[arrow] (6.4, 2.8) -- (6.8, 2.8);

% Arrow connecting row 1 to row 2 (step 3 down to step 4)
\\draw[arrow] (8.8, 4.9) -- (8.8, 4.4) -- (0.8, 4.4) -- (0.8, 3.8);

% Bottom note
\\node[font=\\scriptsize, gray, align=center] at (5, 1.2) {Always wash hands before eating and after using the bathroom!};
\\end{tikzpicture}`,
}
