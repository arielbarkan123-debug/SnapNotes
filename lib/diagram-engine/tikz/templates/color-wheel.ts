import type { TikzTemplate } from '../index'

export const COLOR_WHEEL_TEMPLATE: TikzTemplate = {
  id: 'color-wheel',
  name: 'Color Wheel',
  keywords: [
    'color wheel', 'colour wheel',
    'primary colors', 'secondary colors', 'tertiary colors',
    'primary secondary tertiary',
    'warm colors cool colors',
    'warm and cool colors', 'color theory',
    'red yellow blue', 'color mixing',
  ],
  gradeRange: [1, 5],
  topics: [146, 149],
  category: 'color-wheel',
  referenceCode: `\\usetikzlibrary{calc}
\\begin{tikzpicture}[scale=1.5]
% Title
\\node[font=\\large\\bfseries] at (3, 5.5) {Color Wheel};

% 6-section color wheel (primary + secondary)
% Red at 0, Orange at 60, Yellow at 120, Green at 180, Blue at 240, Purple at 300

% Red sector (0 to 60)
\\fill[red!50] (3,2.5) -- ({3+2*cos(0)},{2.5+2*sin(0)}) arc (0:60:2) -- cycle;
\\draw[thick] (3,2.5) -- ({3+2*cos(0)},{2.5+2*sin(0)}) arc (0:60:2) -- cycle;

% Orange sector (60 to 120)
\\fill[orange!50] (3,2.5) -- ({3+2*cos(60)},{2.5+2*sin(60)}) arc (60:120:2) -- cycle;
\\draw[thick] (3,2.5) -- ({3+2*cos(60)},{2.5+2*sin(60)}) arc (60:120:2) -- cycle;

% Yellow sector (120 to 180)
\\fill[yellow!50] (3,2.5) -- ({3+2*cos(120)},{2.5+2*sin(120)}) arc (120:180:2) -- cycle;
\\draw[thick] (3,2.5) -- ({3+2*cos(120)},{2.5+2*sin(120)}) arc (120:180:2) -- cycle;

% Green sector (180 to 240)
\\fill[green!50] (3,2.5) -- ({3+2*cos(180)},{2.5+2*sin(180)}) arc (180:240:2) -- cycle;
\\draw[thick] (3,2.5) -- ({3+2*cos(180)},{2.5+2*sin(180)}) arc (180:240:2) -- cycle;

% Blue sector (240 to 300)
\\fill[blue!50] (3,2.5) -- ({3+2*cos(240)},{2.5+2*sin(240)}) arc (240:300:2) -- cycle;
\\draw[thick] (3,2.5) -- ({3+2*cos(240)},{2.5+2*sin(240)}) arc (240:300:2) -- cycle;

% Purple sector (300 to 360)
\\fill[red!40!blue!50] (3,2.5) -- ({3+2*cos(300)},{2.5+2*sin(300)}) arc (300:360:2) -- cycle;
\\draw[thick] (3,2.5) -- ({3+2*cos(300)},{2.5+2*sin(300)}) arc (300:360:2) -- cycle;

% Center circle (white)
\\fill[white] (3, 2.5) circle (0.6);
\\draw[thick] (3, 2.5) circle (0.6);

% Labels around the wheel
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at ({3+1.4*cos(30)},{2.5+1.4*sin(30)}) {Red};
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at ({3+1.4*cos(90)},{2.5+1.4*sin(90)}) {Orange};
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at ({3+1.4*cos(150)},{2.5+1.4*sin(150)}) {Yellow};
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at ({3+1.4*cos(210)},{2.5+1.4*sin(210)}) {Green};
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at ({3+1.4*cos(270)},{2.5+1.4*sin(270)}) {Blue};
\\node[font=\\scriptsize\\bfseries, fill=white, inner sep=1pt] at ({3+1.4*cos(330)},{2.5+1.4*sin(330)}) {Purple};

% Legend
\\node[font=\\scriptsize\\bfseries, red!60] at (7, 4) {Primary};
\\node[font=\\scriptsize, gray] at (7, 3.5) {Red, Yellow, Blue};
\\node[font=\\scriptsize\\bfseries, orange!60] at (7, 2.8) {Secondary};
\\node[font=\\scriptsize, gray] at (7, 2.3) {Orange, Green, Purple};
\\end{tikzpicture}`,
}
