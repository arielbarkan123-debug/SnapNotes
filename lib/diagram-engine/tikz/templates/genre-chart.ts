import type { TikzTemplate } from '../index'

export const GENRE_CHART_TEMPLATE: TikzTemplate = {
  id: 'genre-chart',
  name: 'Genre Chart',
  keywords: [
    'genre', 'literary genre',
    'fiction nonfiction', 'types of books',
    'genre chart', 'fantasy realistic fiction',
    'biography autobiography',
    'mystery poetry', 'book genres',
  ],
  gradeRange: [2, 5],
  topics: [224],
  category: 'genre-chart',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.2,
  rootbox/.style={draw, very thick, rounded corners=6pt, fill=gray!15, minimum width=2.5cm, minimum height=0.9cm, align=center, font=\\footnotesize\\bfseries},
  branchbox/.style={draw, very thick, rounded corners=5pt, fill=#1, minimum width=2.5cm, minimum height=0.9cm, align=center, font=\\footnotesize\\bfseries},
  leafbox/.style={draw, thick, rounded corners=4pt, fill=#1, minimum width=2.4cm, minimum height=1.3cm, align=center, font=\\scriptsize},
  arrow/.style={-{Stealth[length=2.5mm,width=2mm]}, very thick, gray!50}
]
% Title
\\node[font=\\large\\bfseries] at (5, 10) {Book Genres};

% Root node
\\node[rootbox] (root) at (5, 8.8) {Genres};

% Branch: Fiction (left)
\\node[branchbox=blue!20] (fiction) at (2.2, 7.2) {Fiction};
\\draw[arrow] (root.south) -- (fiction.north);

% Branch: Nonfiction (right)
\\node[branchbox=green!20] (nonfiction) at (7.8, 7.2) {Nonfiction};
\\draw[arrow] (root.south) -- (nonfiction.north);

% Fiction leaves
\\node[leafbox=blue!8] (fantasy) at (0.5, 5.0) {\\bfseries Fantasy\\\\\\tiny Made-up worlds\\\\\\tiny and magic};
\\node[leafbox=blue!8] (realistic) at (3.0, 5.0) {\\bfseries Realistic\\\\\\bfseries Fiction\\\\\\tiny Could happen\\\\\\tiny in real life};
\\node[leafbox=blue!8] (mystery) at (0.5, 2.8) {\\bfseries Mystery\\\\\\tiny Solve a puzzle\\\\\\tiny or crime};
\\node[leafbox=blue!8] (scifi) at (3.0, 2.8) {\\bfseries Science\\\\\\bfseries Fiction\\\\\\tiny Future or\\\\\\tiny technology};

\\draw[arrow] (fiction.south) -- (fantasy.north);
\\draw[arrow] (fiction.south) -- (realistic.north);
\\draw[arrow] (fiction.south) -- (mystery.north);
\\draw[arrow] (fiction.south) -- (scifi.north);

% Nonfiction leaves
\\node[leafbox=green!8] (bio) at (6.5, 5.0) {\\bfseries Biography\\\\\\tiny Story of a\\\\\\tiny real person};
\\node[leafbox=green!8] (info) at (9.0, 5.0) {\\bfseries Informational\\\\\\tiny Teaches facts\\\\\\tiny about a topic};
\\node[leafbox=green!8] (auto) at (6.5, 2.8) {\\bfseries Autobiography\\\\\\tiny Written by\\\\\\tiny the person};
\\node[leafbox=green!8] (poetry) at (9.0, 2.8) {\\bfseries Poetry\\\\\\tiny Rhythmic\\\\\\tiny language};

\\draw[arrow] (nonfiction.south) -- (bio.north);
\\draw[arrow] (nonfiction.south) -- (info.north);
\\draw[arrow] (nonfiction.south) -- (auto.north);
\\draw[arrow] (nonfiction.south) -- (poetry.north);

% Color-coded legend at bottom
\\node[font=\\scriptsize, blue!60] at (2.2, 1.5) {Fiction = Made-up stories};
\\node[font=\\scriptsize, green!50!black] at (7.8, 1.5) {Nonfiction = True information};
\\end{tikzpicture}`,
}
