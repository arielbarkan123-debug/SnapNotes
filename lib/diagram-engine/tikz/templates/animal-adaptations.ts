import type { TikzTemplate } from '../index'

export const ANIMAL_ADAPTATIONS_TEMPLATE: TikzTemplate = {
  id: 'animal-adaptations',
  name: 'Animal Adaptations',
  keywords: [
    'animal adaptations', 'adaptation', 'camouflage',
    'mimicry', 'structural adaptation', 'behavioral adaptation',
    'animal survival', 'how animals adapt', 'physical adaptation',
  ],
  gradeRange: [2, 5],
  topics: [180, 181],
  category: 'animal-adaptations',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.2,
  box/.style={draw, thick, rounded corners=5pt, fill=#1, minimum width=2.8cm, minimum height=0.9cm, align=center, font=\\footnotesize\\bfseries},
  header/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=3.2cm, minimum height=1cm, align=center, font=\\footnotesize\\bfseries},
  icon/.style={font=\\scriptsize, align=center}
]
% Title
\\node[font=\\large\\bfseries] at (4, 7.8) {Animal Adaptations};
\\node[font=\\scriptsize, gray] at (4, 7.3) {Ways animals survive in their environment};

% Dividing line
\\draw[thick, dashed, gray!50] (4, 0.2) -- (4, 6.8);

% Left column header: Structural
\\node[header=blue!20] (struct) at (1.8, 6.5) {Structural};
\\node[font=\\scriptsize, blue!60] at (1.8, 5.9) {(Body features)};

% Structural boxes with icons
\\node[box=blue!10] (fur) at (1.8, 5.0) {Thick Fur};
\\node[icon, left=0.1cm of fur.west, anchor=east] {\\textbullet};
\\node[font=\\scriptsize, gray] at (1.8, 4.4) {Keeps warm in cold};

\\node[box=blue!10] (claws) at (1.8, 3.3) {Sharp Claws};
\\node[icon, left=0.1cm of claws.west, anchor=east] {\\textbullet};
\\node[font=\\scriptsize, gray] at (1.8, 2.7) {Catch prey, climb trees};

\\node[box=blue!10] (feet) at (1.8, 1.6) {Webbed Feet};
\\node[icon, left=0.1cm of feet.west, anchor=east] {\\textbullet};
\\node[font=\\scriptsize, gray] at (1.8, 1.0) {Swim through water};

% Right column header: Behavioral
\\node[header=green!25] (behav) at (6.2, 6.5) {Behavioral};
\\node[font=\\scriptsize, green!50!black] at (6.2, 5.9) {(Actions/habits)};

% Behavioral boxes with icons
\\node[box=green!10] (hiber) at (6.2, 5.0) {Hibernation};
\\node[icon, left=0.1cm of hiber.west, anchor=east] {\\textbullet};
\\node[font=\\scriptsize, gray] at (6.2, 4.4) {Sleep through winter};

\\node[box=green!10] (migr) at (6.2, 3.3) {Migration};
\\node[icon, left=0.1cm of migr.west, anchor=east] {\\textbullet};
\\node[font=\\scriptsize, gray] at (6.2, 2.7) {Travel to warm areas};

\\node[box=green!10] (noct) at (6.2, 1.6) {Nocturnal};
\\node[icon, left=0.1cm of noct.west, anchor=east] {\\textbullet};
\\node[font=\\scriptsize, gray] at (6.2, 1.0) {Active at night};

% Connecting theme at top
\\draw[very thick, red!40, -{Stealth[length=2.5mm]}] (struct.north) to[bend left=20] node[above, font=\\scriptsize\\bfseries, fill=white, inner sep=2pt] {Survival} (behav.north);
\\end{tikzpicture}`,
}
