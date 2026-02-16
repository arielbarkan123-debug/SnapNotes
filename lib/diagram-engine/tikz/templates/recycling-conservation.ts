import type { TikzTemplate } from '../index'

export const RECYCLING_CONSERVATION_TEMPLATE: TikzTemplate = {
  id: 'recycling-conservation',
  name: 'Recycling and Conservation',
  keywords: [
    'recycling', 'reduce reuse recycle', 'conservation',
    'recycle', 'waste reduction', 'save the environment',
    'three rs', 'reduce waste', 'compost', 'recycling cycle',
  ],
  gradeRange: [2, 5],
  topics: [192],
  category: 'earth-science',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, calc, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.4,
  node/.style={draw, very thick, rounded corners=8pt, fill=#1, minimum width=2.6cm, minimum height=1.2cm, align=center, font=\\footnotesize\\bfseries},
  curvedarrow/.style={-{Stealth[length=3mm,width=2.5mm]}, very thick, #1},
  desc/.style={font=\\scriptsize, align=center, #1}
]
% Title
\\node[font=\\large\\bfseries] at (3.5, 7.5) {Reduce, Reuse, Recycle};
\\node[font=\\scriptsize, gray] at (3.5, 7.0) {The 3 R's of Conservation};

% === Three nodes in a triangle ===

% Reduce (top)
\\node[node=red!20] (reduce) at (3.5, 5.5) {Reduce};
\\node[desc=red!60, below=0.15cm of reduce] {Use less};

% Reuse (bottom-left)
\\node[node=blue!20] (reuse) at (1.0, 1.8) {Reuse};
\\node[desc=blue!60, below=0.15cm of reuse] {Use again};

% Recycle (bottom-right)
\\node[node=green!25] (recycle) at (6.0, 1.8) {Recycle};
\\node[desc=green!60!black, below=0.15cm of recycle] {Make new};

% === Curved arrows connecting in a cycle ===

% Reduce -> Reuse (left side, going down)
\\draw[curvedarrow=red!50] (reduce.south west) to[bend right=25] (reuse.north);

% Reuse -> Recycle (bottom, going right)
\\draw[curvedarrow=blue!50] (reuse.east) to[bend right=25] (recycle.west);

% Recycle -> Reduce (right side, going up)
\\draw[curvedarrow=green!50!black] (recycle.north east) to[bend right=25] (reduce.south east);

% === Recycling symbol in center (three arrows in triangle) ===
% Simplified recycling triangle using three curved arrows
\\draw[very thick, green!60, -{Stealth[length=2mm]}] (3.0, 3.8) to[bend right=15] (2.5, 3.0);
\\draw[very thick, green!60, -{Stealth[length=2mm]}] (2.5, 2.8) to[bend right=15] (4.0, 2.8);
\\draw[very thick, green!60, -{Stealth[length=2mm]}] (4.2, 3.0) to[bend right=15] (3.7, 3.8);

% Center icon
\\node[font=\\scriptsize\\bfseries, green!50!black] at (3.5, 3.3) {3 R's};

% === Examples around the outside ===

% Reduce examples
\\node[draw, thick, rounded corners=3pt, fill=red!8, font=\\scriptsize, align=center] at (6.5, 5.8) {Turn off lights\\\\Shorter showers\\\\Less packaging};

% Reuse examples
\\node[draw, thick, rounded corners=3pt, fill=blue!8, font=\\scriptsize, align=center] at (-1.0, 0.5) {Refill bottles\\\\Donate clothes\\\\Fix broken items};

% Recycle examples
\\node[draw, thick, rounded corners=3pt, fill=green!8, font=\\scriptsize, align=center] at (8.0, 0.5) {Paper to new paper\\\\Cans to new metal\\\\Plastic to new items};

% Leader lines to examples
\\draw[thick, dashed, red!30] (reduce.east) -- (5.5, 5.8);
\\draw[thick, dashed, blue!30] (reuse.south) -- (-0.2, 0.8);
\\draw[thick, dashed, green!30] (recycle.south) -- (7.2, 0.8);
\\end{tikzpicture}`,
}
