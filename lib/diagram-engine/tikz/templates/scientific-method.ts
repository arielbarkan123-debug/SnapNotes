import type { TikzTemplate } from '../index'

export const SCIENTIFIC_METHOD_TEMPLATE: TikzTemplate = {
  id: 'scientific-method',
  name: 'Scientific Method',
  keywords: [
    'scientific method', 'science method',
    'hypothesis experiment', 'ask question hypothesis',
    'observe question hypothesis experiment',
    'science fair steps', 'experiment steps',
    'experiment setup', 'experiment diagram',
    'control variable', 'independent dependent variable',
  ],
  gradeRange: [2, 6],
  topics: [151, 153],
  category: 'scientific-method',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  step/.style={draw, very thick, rounded corners=6pt, fill=#1, minimum width=3.5cm, minimum height=1cm, align=center, font=\\footnotesize\\bfseries},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, blue!50}
]
% Title
\\node[font=\\large\\bfseries] at (4, 9) {The Scientific Method};

% Steps (vertical flow)
\\node[step=yellow!20] (ask) at (4, 7.5) {1. Ask a Question};
\\node[step=orange!20] (research) at (4, 6) {2. Do Research};
\\node[step=green!20] (hyp) at (4, 4.5) {3. Make a Hypothesis};
\\node[step=blue!15] (exp) at (4, 3) {4. Test with Experiment};
\\node[step=purple!15] (analyze) at (4, 1.5) {5. Analyze Results};
\\node[step=red!15] (conclude) at (4, 0) {6. Draw Conclusion};

% Flow arrows
\\draw[arrow] (ask) -- (research);
\\draw[arrow] (research) -- (hyp);
\\draw[arrow] (hyp) -- (exp);
\\draw[arrow] (exp) -- (analyze);
\\draw[arrow] (analyze) -- (conclude);

% Feedback loop (if hypothesis wrong, go back)
\\draw[arrow, red!50, dashed] (conclude.east) -- ++(2, 0) |- (hyp.east);
\\node[font=\\scriptsize, red!50, fill=white, inner sep=2pt] at (7, 2.25) {Try again!};

% Brief descriptions
\\node[font=\\scriptsize, gray, right=0.3cm] at (ask.east) {What do you wonder?};
\\node[font=\\scriptsize, gray, right=0.3cm] at (research.east) {Learn about the topic};
\\node[font=\\scriptsize, gray, right=0.3cm] at (hyp.east) {Make a prediction};
\\node[font=\\scriptsize, gray, right=0.3cm] at (exp.east) {Test your idea};
\\node[font=\\scriptsize, gray, right=0.3cm] at (analyze.east) {What happened?};
\\node[font=\\scriptsize, gray, right=0.3cm] at (conclude.east) {Was your hypothesis right?};
\\end{tikzpicture}`,
}
