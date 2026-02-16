import type { TikzTemplate } from '../index'

export const ANGLES_LINES_TEMPLATE: TikzTemplate = {
  id: 'angles-lines',
  name: 'Angles and Lines',
  keywords: [
    'angle measure', 'protractor', 'measuring angle',
    'right angle', 'acute angle', 'obtuse angle',
    'straight angle', 'draw a ray', 'line segment',
    'ray from', 'ray and angle',
    'parallel lines', 'perpendicular lines',
    'parallel and perpendicular', 'transversal',
    'angle types', 'classify angle',
    'degree angle', 'degrees angle', 'measure angle',
  ],
  gradeRange: [3, 4],
  topics: [38, 47, 48, 49],
  category: 'angles-lines',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
  % Two rays forming a 60-degree angle
  \\draw[very thick, -{Stealth[length=3mm]}] (0,0) -- (5,0);
  \\draw[very thick, -{Stealth[length=3mm]}] (0,0) -- ({5*cos(60)},{5*sin(60)});
  % Angle arc
  \\draw[thick, blue] (1.2,0) arc (0:60:1.2);
  % Angle label
  \\node[blue, font=\\large, fill=white, inner sep=2pt] at ({1.8*cos(30)},{1.8*sin(30)}) {$60^{\\circ}$};
  % Vertex label
  \\node[below left=4pt, font=\\normalsize] at (0,0) {A};
  % Ray labels
  \\node[below=4pt, font=\\normalsize] at (5,0) {B};
  \\node[above left=4pt, font=\\normalsize] at ({5*cos(60)},{5*sin(60)}) {C};
  % Vertex dot
  \\fill (0,0) circle (0.05);
  % Classification label
  \\node[below=1.0cm, font=\\large] at (2.5, 0) {Acute angle ($< 90^{\\circ}$)};
\\end{tikzpicture}`,
}
