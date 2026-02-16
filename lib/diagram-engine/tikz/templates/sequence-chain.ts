import type { TikzTemplate } from '../index'

export const SEQUENCE_CHAIN_TEMPLATE: TikzTemplate = {
  id: 'sequence-chain',
  name: 'Sequence Chain',
  keywords: [
    'sequence chain', 'sequence of events',
    'first then next last',
    'first next then finally',
    'story sequence', 'event chain',
    'order of events',
    'flow chart sequence', 'retelling sequence',
    'sequence of steps',
  ],
  gradeRange: [1, 4],
  topics: [134],
  category: 'sequence-chain',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  step/.style={draw, thick, rounded corners=6pt, fill=#1, minimum width=2.5cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, gray!60}
]
% Title
\\node[font=\\large\\bfseries] at (5, 5) {Sequence Chain};

% Steps in a horizontal chain
\\node[step=blue!15] (s1) at (0, 3) {First};
\\node[step=green!15] (s2) at (3.5, 3) {Next};
\\node[step=orange!15] (s3) at (7, 3) {Then};
\\node[step=red!15] (s4) at (10.5, 3) {Finally};

% Arrows between steps
\\draw[arrow] (s1) -- (s2);
\\draw[arrow] (s2) -- (s3);
\\draw[arrow] (s3) -- (s4);

% Step numbers
\\node[circle, fill=blue!60, text=white, font=\\scriptsize\\bfseries, inner sep=2pt, above=0.3cm] at (s1.north) {1};
\\node[circle, fill=green!60, text=white, font=\\scriptsize\\bfseries, inner sep=2pt, above=0.3cm] at (s2.north) {2};
\\node[circle, fill=orange!60, text=white, font=\\scriptsize\\bfseries, inner sep=2pt, above=0.3cm] at (s3.north) {3};
\\node[circle, fill=red!60, text=white, font=\\scriptsize\\bfseries, inner sep=2pt, above=0.3cm] at (s4.north) {4};

% Detail boxes below
\\node[draw, thin, rounded corners=3pt, fill=blue!5, minimum width=2.2cm, text width=2cm, align=center, font=\\scriptsize] at (0, 1.2) {Write event details here};
\\node[draw, thin, rounded corners=3pt, fill=green!5, minimum width=2.2cm, text width=2cm, align=center, font=\\scriptsize] at (3.5, 1.2) {Write event details here};
\\node[draw, thin, rounded corners=3pt, fill=orange!5, minimum width=2.2cm, text width=2cm, align=center, font=\\scriptsize] at (7, 1.2) {Write event details here};
\\node[draw, thin, rounded corners=3pt, fill=red!5, minimum width=2.2cm, text width=2cm, align=center, font=\\scriptsize] at (10.5, 1.2) {Write event details here};
\\end{tikzpicture}`,
}
