import type { TikzTemplate } from '../index'

export const DENTAL_HEALTH_TEMPLATE: TikzTemplate = {
  id: 'dental-health',
  name: 'Dental Health',
  keywords: [
    'tooth types', 'types of teeth',
    'dental health', 'teeth diagram',
    'incisor canine molar', 'premolar',
    'parts of a tooth', 'tooth structure',
    'brush teeth', 'dental care',
    'baby teeth adult teeth',
  ],
  gradeRange: [1, 4],
  topics: [143],
  category: 'dental-health',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  tooth/.style={draw, thick, rounded corners=2pt, fill=#1, minimum width=1.2cm, minimum height=1.5cm, align=center, font=\\scriptsize\\bfseries},
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=2pt}
]
% Title
\\node[font=\\large\\bfseries] at (5, 6.5) {Types of Teeth};

% Incisors
\\node[tooth=white] (inc) at (1, 4) {Incisor};
\\draw[thick] (0.5, 4.8) -- (0.5, 4.5) -- (1.5, 4.5) -- (1.5, 4.8); % flat top
\\node[font=\\scriptsize, gray, below=0.3cm, text width=2cm, align=center] at (inc.south) {Cuts and\\\\bites food};
\\node[circle, fill=blue!40, text=white, font=\\tiny\\bfseries, inner sep=1pt, above=0.3cm] at (inc.north) {8};

% Canines
\\node[tooth=yellow!10] (can) at (3.5, 4) {Canine};
\\draw[thick] (3, 4.8) -- (3.5, 5.2) -- (4, 4.8); % pointed top
\\node[font=\\scriptsize, gray, below=0.3cm, text width=2cm, align=center] at (can.south) {Tears and\\\\rips food};
\\node[circle, fill=green!40, text=white, font=\\tiny\\bfseries, inner sep=1pt, above=0.3cm] at (can.north) {4};

% Premolars
\\node[tooth=orange!10] (pre) at (6, 4) {Premolar};
\\draw[thick] (5.5, 4.8) -- (5.7, 5) -- (6, 4.8) -- (6.3, 5) -- (6.5, 4.8); % bumpy top
\\node[font=\\scriptsize, gray, below=0.3cm, text width=2cm, align=center] at (pre.south) {Crushes\\\\food};
\\node[circle, fill=orange!40, text=white, font=\\tiny\\bfseries, inner sep=1pt, above=0.3cm] at (pre.north) {8};

% Molars
\\node[tooth=pink!10] (mol) at (8.5, 4) {Molar};
\\draw[thick] (8, 4.8) -- (8.15, 5) -- (8.35, 4.8) -- (8.5, 5) -- (8.65, 4.8) -- (8.85, 5) -- (9, 4.8); % very bumpy
\\node[font=\\scriptsize, gray, below=0.3cm, text width=2cm, align=center] at (mol.south) {Grinds\\\\food};
\\node[circle, fill=red!40, text=white, font=\\tiny\\bfseries, inner sep=1pt, above=0.3cm] at (mol.north) {12};

% Legend
\\node[font=\\scriptsize, gray] at (5, 1) {Numbers show how many of each type adults have (32 total)};
\\end{tikzpicture}`,
}
