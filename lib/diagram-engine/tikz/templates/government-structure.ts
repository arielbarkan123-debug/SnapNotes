import type { TikzTemplate } from '../index'

export const GOVERNMENT_STRUCTURE_TEMPLATE: TikzTemplate = {
  id: 'government-structure',
  name: 'Government Structure',
  keywords: [
    'three branches of government', 'branches of government',
    'legislative executive judicial',
    'checks and balances', 'separation of powers',
    'government structure', 'how government works',
    'congress president supreme court',
    'us government', 'federal government',
    'constitution government',
  ],
  gradeRange: [3, 6],
  topics: [127],
  category: 'government-structure',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  branch/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=3cm, minimum height=1.5cm, align=center, font=\\footnotesize\\bfseries},
  detail/.style={font=\\scriptsize, align=center, text width=2.8cm}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7.5) {Three Branches of Government};

% Three branches
\\node[branch=blue!20] (leg) at (0.5, 5) {Legislative\\\\Branch};
\\node[branch=red!20] (exec) at (5, 5) {Executive\\\\Branch};
\\node[branch=green!20] (jud) at (9.5, 5) {Judicial\\\\Branch};

% Details
\\node[detail] at (0.5, 3) {\\textbf{Congress}\\\\(Senate \\& House)\\\\Makes the laws};
\\node[detail] at (5, 3) {\\textbf{President}\\\\Carries out\\\\the laws};
\\node[detail] at (9.5, 3) {\\textbf{Supreme Court}\\\\Interprets\\\\the laws};

% Checks and balances arrows
\\draw[{Stealth[length=2.5mm]}-{Stealth[length=2.5mm]}, thick, purple!50] (leg.east) -- (exec.west);
\\draw[{Stealth[length=2.5mm]}-{Stealth[length=2.5mm]}, thick, purple!50] (exec.east) -- (jud.west);
\\draw[{Stealth[length=2.5mm]}-{Stealth[length=2.5mm]}, thick, purple!50, bend left=30] (leg.south east) to (jud.south west);

% Checks label
\\node[font=\\scriptsize, purple!60, fill=white, inner sep=2pt] at (5, 1.2) {Checks and Balances};
\\end{tikzpicture}`,
}
