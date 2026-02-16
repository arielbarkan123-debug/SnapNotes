import type { TikzTemplate } from '../index'

export const FEELINGS_EMOTIONS_TEMPLATE: TikzTemplate = {
  id: 'feelings-emotions',
  name: 'Feelings and Emotions',
  keywords: [
    'feelings', 'emotions',
    'feelings chart', 'emotion wheel',
    'happy sad angry', 'how do you feel',
    'identify emotions', 'feelings wheel',
    'emotional health',
  ],
  gradeRange: [1, 4],
  topics: [221],
  category: 'feelings-emotions',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.5]
% Title
\\node[font=\\large\\bfseries] at (3, 5.5) {How Do You Feel?};

% Wedge fills (6 equal 60-degree wedges)
% Happy (yellow) -- 60 to 120 degrees
\\fill[yellow!30] (3, 2.5) -- (3, 4.5) arc (90:150:2) -- cycle;
% Sad (blue) -- 120 to 180 degrees
\\fill[blue!20] (3, 2.5) -- ({3+2*cos(150)}, {2.5+2*sin(150)}) arc (150:210:2) -- cycle;
% Angry (red) -- 180 to 240 degrees
\\fill[red!20] (3, 2.5) -- ({3+2*cos(210)}, {2.5+2*sin(210)}) arc (210:270:2) -- cycle;
% Scared (purple) -- 240 to 300 degrees
\\fill[purple!15] (3, 2.5) -- (3, 0.5) arc (270:330:2) -- cycle;
% Surprised (orange) -- 300 to 360 degrees
\\fill[orange!20] (3, 2.5) -- ({3+2*cos(330)}, {2.5+2*sin(330)}) arc (330:390:2) -- cycle;
% Calm (green) -- 0 to 60 degrees (30 to 90)
\\fill[green!20] (3, 2.5) -- ({3+2*cos(30)}, {2.5+2*sin(30)}) arc (30:90:2) -- cycle;

% Circle outline
\\draw[very thick] (3, 2.5) circle (2);

% Dividing lines (6 spokes)
\\draw[thick] (3, 2.5) -- (3, 4.5);
\\draw[thick] (3, 2.5) -- ({3+2*cos(150)}, {2.5+2*sin(150)});
\\draw[thick] (3, 2.5) -- ({3+2*cos(210)}, {2.5+2*sin(210)});
\\draw[thick] (3, 2.5) -- (3, 0.5);
\\draw[thick] (3, 2.5) -- ({3+2*cos(330)}, {2.5+2*sin(330)});
\\draw[thick] (3, 2.5) -- ({3+2*cos(30)}, {2.5+2*sin(30)});

% Emotion labels (positioned at midpoint of each wedge arc)
% Happy -- at 120 degrees midpoint (between 90 and 150)
\\node[font=\\scriptsize\\bfseries, yellow!50!orange] at ({3+1.3*cos(120)}, {2.5+1.3*sin(120)}) {Happy};
% Smile face for Happy
\\draw[thick, yellow!60!orange] ({3+1.3*cos(120)-0.15}, {2.5+1.3*sin(120)-0.35}) arc (210:330:0.18);

% Sad -- at 180 degrees midpoint (between 150 and 210)
\\node[font=\\scriptsize\\bfseries, blue!70] at ({3+1.3*cos(180)}, {2.5+1.3*sin(180)+0.1}) {Sad};
% Frown for Sad
\\draw[thick, blue!70] ({3+1.3*cos(180)-0.15}, {2.5+1.3*sin(180)-0.35}) arc (150:30:0.18);

% Angry -- at 240 degrees midpoint (between 210 and 270)
\\node[font=\\scriptsize\\bfseries, red!70] at ({3+1.3*cos(240)}, {2.5+1.3*sin(240)+0.1}) {Angry};
% Angled brows for Angry
\\draw[thick, red!70] ({3+1.3*cos(240)-0.15}, {2.5+1.3*sin(240)-0.25}) -- ({3+1.3*cos(240)+0.15}, {2.5+1.3*sin(240)-0.35});

% Scared -- at 300 degrees midpoint (between 270 and 330)
\\node[font=\\scriptsize\\bfseries, purple!70] at ({3+1.3*cos(300)}, {2.5+1.3*sin(300)+0.1}) {Scared};
% Open mouth for Scared
\\draw[thick, purple!70] ({3+1.3*cos(300)}, {2.5+1.3*sin(300)-0.35}) circle (0.1);

% Surprised -- at 0/360 degrees midpoint (between 330 and 30)
\\node[font=\\scriptsize\\bfseries, orange!70] at ({3+1.3*cos(0)}, {2.5+1.3*sin(0)+0.1}) {Surprised};
% Open O mouth
\\draw[thick, orange!70] ({3+1.3*cos(0)}, {2.5+1.3*sin(0)-0.3}) circle (0.12);

% Calm -- at 60 degrees midpoint (between 30 and 90)
\\node[font=\\scriptsize\\bfseries, green!50!black] at ({3+1.3*cos(60)}, {2.5+1.3*sin(60)}) {Calm};
% Gentle line for Calm
\\draw[thick, green!50!black] ({3+1.3*cos(60)-0.15}, {2.5+1.3*sin(60)-0.35}) -- ({3+1.3*cos(60)+0.15}, {2.5+1.3*sin(60)-0.35});

% Center label
\\node[fill=white, draw, thick, rounded corners=3pt, font=\\scriptsize\\bfseries, inner sep=3pt] at (3, 2.5) {Feelings};
\\end{tikzpicture}`,
}
