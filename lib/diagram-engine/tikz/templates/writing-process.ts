import type { TikzTemplate } from '../index'

export const WRITING_PROCESS_TEMPLATE: TikzTemplate = {
  id: 'writing-process',
  name: 'Writing Process',
  keywords: [
    'writing process', 'prewrite draft revise edit publish',
    'writing steps', 'five step writing',
    'brainstorm draft', 'revision editing',
    'publishing writing', 'writing stages',
  ],
  gradeRange: [2, 5],
  topics: [214, 215],
  category: 'writing-process',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.3,
  step/.style={draw, very thick, fill=#1, minimum width=2cm, minimum height=1.8cm, align=center, font=\\scriptsize\\bfseries, rounded corners=6pt},
  arrow/.style={-{Stealth[length=3.5mm,width=2.5mm]}, very thick, gray!50}
]
% Title
\\node[font=\\large\\bfseries] at (6, 7.5) {The Writing Process};

% Step 1: Prewrite (yellow)
\\node[step=yellow!25] (pre) at (1, 5) {\\footnotesize 1. Prewrite\\\\[4pt]{\\tiny Plan your}\\\\{\\tiny ideas}};
% Lightbulb icon (simple)
\\fill[yellow!70] (1, 6.2) circle (0.25);
\\draw[thick, yellow!80!black] (1, 6.2) circle (0.25);
\\draw[thick, yellow!80!black] (0.9, 5.85) -- (0.9, 5.7);
\\draw[thick, yellow!80!black] (1.1, 5.85) -- (1.1, 5.7);
\\draw[thick, yellow!80!black] (0.85, 5.7) -- (1.15, 5.7);

% Step 2: Draft (blue)
\\node[step=blue!20] (draft) at (4, 5) {\\footnotesize 2. Draft\\\\[4pt]{\\tiny Write it}\\\\{\\tiny down}};
% Pencil icon (simple)
\\draw[thick, blue!60] (3.8, 6.1) -- (4.2, 6.5);
\\draw[thick, blue!60] (4.2, 6.5) -- (4.3, 6.4);
\\draw[thick, blue!60] (4.3, 6.4) -- (3.9, 6);
\\fill[yellow!60] (3.8, 6.1) -- (3.75, 5.95) -- (3.9, 6) -- cycle;

% Step 3: Revise (green)
\\node[step=green!20] (rev) at (7, 5) {\\footnotesize 3. Revise\\\\[4pt]{\\tiny Make it}\\\\{\\tiny better}};
% Circular arrows icon
\\draw[thick, green!50!black, -{Stealth[length=2mm]}] (6.8, 6.3) arc (180:0:0.2);
\\draw[thick, green!50!black, -{Stealth[length=2mm]}] (7.2, 6.3) arc (0:-180:0.2);

% Step 4: Edit (orange)
\\node[step=orange!20] (edit) at (10, 5) {\\footnotesize 4. Edit\\\\[4pt]{\\tiny Fix}\\\\{\\tiny mistakes}};
% Magnifying glass icon
\\draw[thick, orange!60] (10, 6.4) circle (0.2);
\\draw[thick, orange!60] (10.15, 6.25) -- (10.3, 6.05);

% Step 5: Publish (purple)
\\node[step=purple!20] (pub) at (5.5, 1.8) {\\footnotesize 5. Publish\\\\[4pt]{\\tiny Share your}\\\\{\\tiny work}};
% Book icon
\\draw[thick, purple!60] (5.2, 3.0) rectangle (5.8, 3.5);
\\draw[thick, purple!60] (5.5, 3.0) -- (5.5, 3.5);

% Arrows between steps
\\draw[arrow] (pre.east) -- (draft.west);
\\draw[arrow] (draft.east) -- (rev.west);
\\draw[arrow] (rev.east) -- (edit.west);
\\draw[arrow] (edit.south) -- ++(0, -1) -| (pub.north);

% Step numbers in circles (colored)
\\node[circle, fill=yellow!60, text=black, font=\\tiny\\bfseries, inner sep=1.5pt] at (-0.1, 5.8) {1};
\\node[circle, fill=blue!50, text=white, font=\\tiny\\bfseries, inner sep=1.5pt] at (2.9, 5.8) {2};
\\node[circle, fill=green!50, text=white, font=\\tiny\\bfseries, inner sep=1.5pt] at (5.9, 5.8) {3};
\\node[circle, fill=orange!60, text=white, font=\\tiny\\bfseries, inner sep=1.5pt] at (8.9, 5.8) {4};
\\node[circle, fill=purple!50, text=white, font=\\tiny\\bfseries, inner sep=1.5pt] at (4.4, 2.6) {5};

% Bottom note
\\node[font=\\scriptsize, text=gray!60!black, align=center] at (5.5, 0.5) {Good writers follow these five steps!};
\\end{tikzpicture}`,
}
