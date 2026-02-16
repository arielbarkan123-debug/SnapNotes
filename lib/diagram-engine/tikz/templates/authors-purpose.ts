import type { TikzTemplate } from '../index'

export const AUTHORS_PURPOSE_TEMPLATE: TikzTemplate = {
  id: 'authors-purpose',
  name: "Author's Purpose",
  keywords: [
    'author purpose', 'authors purpose',
    'persuade inform entertain',
    'PIE author', 'why did the author write',
    'purpose of text', 'author intent',
  ],
  gradeRange: [2, 5],
  topics: [223],
  category: 'authors-purpose',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.5,
  exbox/.style={draw, thick, rounded corners=3pt, fill=#1, minimum width=2.2cm, minimum height=0.5cm, align=center, font=\\scriptsize}
]
% Title
\\node[font=\\large\\bfseries] at (3, 5.8) {Author's Purpose: PIE};

% Pie circle -- 3 equal slices (120 degrees each)
% Slice 1: Persuade (red) -- 90 to 210 degrees
\\fill[red!25] (3, 2.8) -- (3, 4.8) arc (90:210:2) -- cycle;
% Slice 2: Inform (blue) -- 210 to 330 degrees
\\fill[blue!20] (3, 2.8) -- ({3+2*cos(210)}, {2.8+2*sin(210)}) arc (210:330:2) -- cycle;
% Slice 3: Entertain (yellow) -- 330 to 450(=90) degrees
\\fill[yellow!30] (3, 2.8) -- ({3+2*cos(330)}, {2.8+2*sin(330)}) arc (330:450:2) -- cycle;

% Outline
\\draw[very thick] (3, 2.8) circle (2);

% Dividing lines
\\draw[thick] (3, 2.8) -- (3, 4.8);
\\draw[thick] (3, 2.8) -- ({3+2*cos(210)}, {2.8+2*sin(210)});
\\draw[thick] (3, 2.8) -- ({3+2*cos(330)}, {2.8+2*sin(330)});

% Center label
\\node[fill=white, draw, very thick, circle, inner sep=3pt, font=\\footnotesize\\bfseries] at (3, 2.8) {PIE};

% Slice labels
% Persuade -- midpoint at 150 degrees
\\node[font=\\footnotesize\\bfseries, red!70] at ({3+1.1*cos(150)}, {2.8+1.1*sin(150)+0.15}) {P};
\\node[font=\\scriptsize, red!60] at ({3+1.1*cos(150)}, {2.8+1.1*sin(150)-0.15}) {Persuade};

% Inform -- midpoint at 270 degrees
\\node[font=\\footnotesize\\bfseries, blue!70] at ({3+1.1*cos(270)}, {2.8+1.1*sin(270)+0.15}) {I};
\\node[font=\\scriptsize, blue!60] at ({3+1.1*cos(270)}, {2.8+1.1*sin(270)-0.15}) {Inform};

% Entertain -- midpoint at 30 degrees
\\node[font=\\footnotesize\\bfseries, yellow!50!orange] at ({3+1.1*cos(30)}, {2.8+1.1*sin(30)+0.15}) {E};
\\node[font=\\scriptsize, yellow!50!orange] at ({3+1.1*cos(30)}, {2.8+1.1*sin(30)-0.15}) {Entertain};

% Subtitle descriptions outside the pie
% Persuade
\\node[font=\\scriptsize, red!60, anchor=east] at (0.5, 4.0) {Convince you};
\\draw[-{Stealth[length=2mm]}, thick, red!40] (0.7, 3.9) -- (1.3, 3.5);
\\node[exbox=red!10] at (0.3, 3.2) {Ad for shoes};

% Inform
\\node[font=\\scriptsize, blue!60] at (3, 0.3) {Teach you facts};
\\draw[-{Stealth[length=2mm]}, thick, blue!40] (3, 0.5) -- (3, 1.0);
\\node[exbox=blue!10] at (3, -0.2) {Textbook};

% Entertain
\\node[font=\\scriptsize, yellow!50!orange, anchor=west] at (5.5, 4.0) {Make you enjoy};
\\draw[-{Stealth[length=2mm]}, thick, yellow!50!orange] (5.3, 3.9) -- (4.7, 3.5);
\\node[exbox=yellow!10] at (5.7, 3.2) {Funny story};
\\end{tikzpicture}`,
}
