import type { TikzTemplate } from '../index'

export const STATES_OF_MATTER_TEMPLATE: TikzTemplate = {
  id: 'states-of-matter',
  name: 'States of Matter',
  keywords: [
    'states of matter', 'solid liquid gas',
    'phase change', 'phase changes',
    'melting freezing evaporation condensation',
    'matter states', 'three states of matter',
    'boiling point', 'melting point',
    'particles in solid liquid gas',
  ],
  gradeRange: [2, 5],
  topics: [111],
  category: 'states-of-matter',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  state/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=2.8cm, minimum height=2cm, align=center, font=\\footnotesize\\bfseries},
  change/.style={font=\\scriptsize\\bfseries, fill=white, inner sep=2pt, align=center},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1}
]
% Title
\\node[font=\\large\\bfseries] at (5, 6.5) {States of Matter};

% Three states
\\node[state=blue!20] (solid) at (0.5, 3.5) {Solid\\\\[6pt]\\scriptsize Particles close\\\\\\scriptsize together, vibrate};
\\node[state=cyan!20] (liquid) at (5, 3.5) {Liquid\\\\[6pt]\\scriptsize Particles slide\\\\\\scriptsize past each other};
\\node[state=red!15] (gas) at (9.5, 3.5) {Gas\\\\[6pt]\\scriptsize Particles spread\\\\\\scriptsize out, move fast};

% Particle diagrams inside states
% Solid: tightly packed dots
\\foreach \\x in {-0.3, 0, 0.3} {
  \\foreach \\y in {2.7, 3.0, 3.3} {
    \\fill[blue!60] (0.5+\\x, \\y) circle (0.08);
  }
}

% Liquid: loosely arranged dots
\\foreach \\pos in {(4.7,2.7), (5,2.8), (5.3,2.7), (4.8,3.1), (5.2,3.0), (5,3.3)} {
  \\fill[cyan!60] \\pos circle (0.08);
}

% Gas: widely spread dots
\\foreach \\pos in {(9.2,2.7), (9.8,3.4), (9.5,2.9), (9.3,3.3), (9.7,2.8), (9.9,3.1)} {
  \\fill[red!50] \\pos circle (0.08);
}

% Phase change arrows (forward)
\\draw[arrow=red!60, bend left=20] (solid.north east) to node[change, above] {Melting\\\\(Add Heat)} (liquid.north west);
\\draw[arrow=red!60, bend left=20] (liquid.north east) to node[change, above] {Evaporation\\\\(Add Heat)} (gas.north west);

% Phase change arrows (reverse)
\\draw[arrow=blue!60, bend left=20] (liquid.south west) to node[change, below] {Freezing\\\\(Remove Heat)} (solid.south east);
\\draw[arrow=blue!60, bend left=20] (gas.south west) to node[change, below] {Condensation\\\\(Remove Heat)} (liquid.south east);
\\end{tikzpicture}`,
}
