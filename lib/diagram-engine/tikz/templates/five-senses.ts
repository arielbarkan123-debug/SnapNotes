import type { TikzTemplate } from '../index'

export const FIVE_SENSES_TEMPLATE: TikzTemplate = {
  id: 'five-senses',
  name: 'Five Senses',
  keywords: [
    'five senses', '5 senses',
    'sight hearing smell taste touch',
    'senses diagram', 'sense organs',
    'eyes ears nose tongue skin',
    'sensory organs',
  ],
  gradeRange: [1, 3],
  topics: [110, 144],
  category: 'five-senses',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  sense/.style={draw, thick, rounded corners=6pt, fill=#1, minimum width=2.4cm, minimum height=1.4cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=2.5mm]}, thick, gray!60}
]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {The Five Senses};

% Central brain/body
\\node[draw, very thick, circle, fill=pink!15, minimum size=2cm, font=\\footnotesize\\bfseries, align=center] (brain) at (5, 4) {Brain};

% Five senses around the brain
\\node[sense=blue!15] (sight) at (1, 6) {Sight\\\\(Eyes)};
\\node[sense=green!15] (hearing) at (9, 6) {Hearing\\\\(Ears)};
\\node[sense=yellow!15] (smell) at (1, 2) {Smell\\\\(Nose)};
\\node[sense=red!15] (taste) at (9, 2) {Taste\\\\(Tongue)};
\\node[sense=purple!15] (touch) at (5, 0.5) {Touch\\\\(Skin)};

% Arrows to brain
\\draw[arrow] (sight) -- (brain);
\\draw[arrow] (hearing) -- (brain);
\\draw[arrow] (smell) -- (brain);
\\draw[arrow] (taste) -- (brain);
\\draw[arrow] (touch) -- (brain);

% Example labels
\\node[font=\\scriptsize, gray, right=0.1cm] at (sight.east) {See colors, shapes};
\\node[font=\\scriptsize, gray, left=0.1cm] at (hearing.west) {Hear sounds, music};
\\node[font=\\scriptsize, gray, right=0.1cm] at (smell.east) {Smell flowers, food};
\\node[font=\\scriptsize, gray, left=0.1cm] at (taste.west) {Taste sweet, sour};
\\node[font=\\scriptsize, gray, below=0.1cm] at (touch.south) {Feel hot, cold, soft};
\\end{tikzpicture}`,
}
