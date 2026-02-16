import type { TikzTemplate } from '../index'

export const INHERITED_LEARNED_TRAITS_TEMPLATE: TikzTemplate = {
  id: 'inherited-learned-traits',
  name: 'Inherited vs Learned Traits',
  keywords: [
    'inherited traits', 'learned behaviors', 'inherited vs learned',
    'traits from parents', 'nature nurture', 'eye color inherited',
    'riding bike learned', 'genes traits',
  ],
  gradeRange: [2, 4],
  topics: [186],
  category: 'animal-adaptations',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}
\\begin{tikzpicture}[scale=1.2,
  box/.style={draw, thick, rounded corners=6pt, fill=#1, minimum width=2.6cm, minimum height=0.8cm, align=center, font=\\footnotesize\\bfseries},
  header/.style={draw, very thick, rounded corners=8pt, fill=#1, minimum width=3.4cm, minimum height=1cm, align=center, font=\\footnotesize\\bfseries}
]
% Title
\\node[font=\\large\\bfseries] at (4.5, 9.0) {Inherited vs. Learned Traits};

% Dividing line
\\draw[very thick, gray!40] (4.5, 0.5) -- (4.5, 8.2);
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=3pt] at (4.5, 4.5) {VS};

% === LEFT: Inherited Traits ===
\\node[header=purple!20] (iheader) at (2.0, 7.8) {Inherited Traits};
\\node[font=\\scriptsize, purple!60, align=center] at (2.0, 7.1) {From your parents\\\\(Born with them)};

\\node[box=purple!10] at (2.0, 6.2) {Eye Color};
\\node[box=purple!10] at (2.0, 5.1) {Hair Color};
\\node[box=purple!10] at (2.0, 4.0) {Skin Color};
\\node[box=purple!10] at (2.0, 2.9) {Height};
\\node[box=purple!10] at (2.0, 1.8) {Freckles};

% DNA icon placeholder
\\node[circle, draw, thick, fill=purple!15, minimum size=0.7cm, font=\\scriptsize\\bfseries] at (0.2, 7.8) {DNA};

% === RIGHT: Learned Behaviors ===
\\node[header=teal!25] (lheader) at (7.0, 7.8) {Learned Behaviors};
\\node[font=\\scriptsize, teal!70, align=center] at (7.0, 7.1) {From experience\\\\(Practice and teaching)};

\\node[box=teal!10] at (7.0, 6.2) {Reading};
\\node[box=teal!10] at (7.0, 5.1) {Riding a Bike};
\\node[box=teal!10] at (7.0, 4.0) {Cooking};
\\node[box=teal!10] at (7.0, 2.9) {Speaking a\\\\Language};

% Book icon placeholder
\\node[draw, thick, fill=teal!15, minimum width=0.7cm, minimum height=0.5cm, rounded corners=2pt, font=\\scriptsize\\bfseries] at (8.8, 7.8) {!};

% Bottom summary
\\node[draw, thick, rounded corners=4pt, fill=yellow!10, font=\\scriptsize, align=center, minimum width=8cm] at (4.5, 0.5) {Inherited = passed through genes \\quad | \\quad Learned = gained through experience};
\\end{tikzpicture}`,
}
