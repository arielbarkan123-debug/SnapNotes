import type { TikzTemplate } from '../index'

export const CAUSE_EFFECT_TEMPLATE: TikzTemplate = {
  id: 'cause-effect',
  name: 'Cause and Effect',
  keywords: [
    'cause and effect', 'cause effect',
    'because so then',
    'what caused', 'what happened because',
    'if then diagram', 'consequence',
    'reason and result', 'cause effect chain',
  ],
  gradeRange: [1, 6],
  topics: [137],
  category: 'cause-effect',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  cause/.style={draw, thick, rounded corners=6pt, fill=blue!15, minimum width=3cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  effect/.style={draw, thick, rounded corners=6pt, fill=red!15, minimum width=3cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, gray!60}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Cause and Effect};

% Headers
\\node[font=\\footnotesize\\bfseries, blue!70] at (2, 6) {CAUSE};
\\node[font=\\footnotesize\\bfseries] at (5, 6) {leads to};
\\node[font=\\footnotesize\\bfseries, red!70] at (8, 6) {EFFECT};

% Row 1
\\node[cause] (c1) at (2, 4.5) {Cause 1};
\\node[effect] (e1) at (8, 4.5) {Effect 1};
\\draw[arrow] (c1) -- (e1);

% Row 2
\\node[cause] (c2) at (2, 3) {Cause 2};
\\node[effect] (e2) at (8, 3) {Effect 2};
\\draw[arrow] (c2) -- (e2);

% Row 3
\\node[cause] (c3) at (2, 1.5) {Cause 3};
\\node[effect] (e3) at (8, 1.5) {Effect 3};
\\draw[arrow] (c3) -- (e3);

% Because/So labels on arrows
\\node[font=\\scriptsize, fill=white, inner sep=2pt] at (5, 4.5) {so};
\\node[font=\\scriptsize, fill=white, inner sep=2pt] at (5, 3) {so};
\\node[font=\\scriptsize, fill=white, inner sep=2pt] at (5, 1.5) {so};
\\end{tikzpicture}`,
}
