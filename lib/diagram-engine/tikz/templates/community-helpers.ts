import type { TikzTemplate } from '../index'

export const COMMUNITY_HELPERS_TEMPLATE: TikzTemplate = {
  id: 'community-helpers',
  name: 'Community Helpers',
  keywords: [
    'community helpers', 'community workers',
    'jobs in community', 'firefighter police teacher',
    'community roles', 'who helps us',
    'neighborhood helpers',
  ],
  gradeRange: [1, 3],
  topics: [209],
  category: 'community-helpers',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  helper/.style={draw, very thick, fill=#1, minimum width=2.5cm, minimum height=1.4cm, align=center, font=\\scriptsize\\bfseries, rounded corners=5pt},
  arrow/.style={-{Stealth[length=2.5mm,width=2mm]}, thick, gray!60}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7.5) {Community Helpers};

% Center circle
\\node[draw, very thick, fill=yellow!20, circle, minimum size=2.2cm, align=center, font=\\footnotesize\\bfseries] (center) at (5, 4) {Community\\\\Helpers};

% Helper boxes arranged around center
% Top-left: Firefighter (red)
\\node[helper=red!20] (fire) at (1.5, 6.2) {Firefighter\\\\{\\tiny Puts out fires}\\\\{\\tiny and rescues people}};

% Top-right: Police Officer (blue)
\\node[helper=blue!20] (police) at (8.5, 6.2) {Police Officer\\\\{\\tiny Keeps us safe}\\\\{\\tiny and enforces laws}};

% Middle-left: Teacher (green)
\\node[helper=green!20] (teach) at (1.5, 4) {Teacher\\\\{\\tiny Helps children}\\\\{\\tiny learn new things}};

% Middle-right: Doctor/Nurse (white with border)
\\node[helper=white] (doctor) at (8.5, 4) {Doctor / Nurse\\\\{\\tiny Takes care of}\\\\{\\tiny sick people}};
% Red cross on doctor box
\\fill[red!60] (9.5, 4.5) rectangle (9.6, 4.8);
\\fill[red!60] (9.4, 4.6) rectangle (9.7, 4.7);

% Bottom-left: Mail Carrier (purple)
\\node[helper=purple!15] (mail) at (1.5, 1.8) {Mail Carrier\\\\{\\tiny Delivers letters}\\\\{\\tiny and packages}};

% Bottom-right: Librarian (orange)
\\node[helper=orange!15] (lib) at (8.5, 1.8) {Librarian\\\\{\\tiny Helps us find}\\\\{\\tiny and read books}};

% Lines connecting helpers to center
\\draw[arrow] (center.north west) -- (fire.south east);
\\draw[arrow] (center.north east) -- (police.south west);
\\draw[arrow] (center.west) -- (teach.east);
\\draw[arrow] (center.east) -- (doctor.west);
\\draw[arrow] (center.south west) -- (mail.north east);
\\draw[arrow] (center.south east) -- (lib.north west);

% Small colored dots on connection lines
\\fill[red!60] (3.1, 5.3) circle (0.08);
\\fill[blue!60] (6.9, 5.3) circle (0.08);
\\fill[green!60] (3.1, 4) circle (0.08);
\\fill[gray!60] (6.9, 4) circle (0.08);
\\fill[purple!60] (3.1, 2.7) circle (0.08);
\\fill[orange!60] (6.9, 2.7) circle (0.08);
\\end{tikzpicture}`,
}
