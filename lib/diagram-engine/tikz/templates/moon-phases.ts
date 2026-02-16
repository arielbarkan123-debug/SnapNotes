import type { TikzTemplate } from '../index'

export const MOON_PHASES_TEMPLATE: TikzTemplate = {
  id: 'moon-phases',
  name: 'Moon Phases',
  keywords: [
    'moon phases', 'phases of the moon',
    'new moon full moon', 'crescent gibbous',
    'waxing waning', 'lunar cycle',
    'first quarter', 'third quarter',
    'moon cycle', 'lunar phases',
  ],
  gradeRange: [2, 5],
  topics: [104],
  category: 'moon-phases',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.3]
% Title
\\node[font=\\large\\bfseries] at (7, 5.5) {Phases of the Moon};

% 8 phases in a row
\\def\\moonR{0.7}

% Phase 1: New Moon (all dark)
\\fill[gray!70] (0, 3) circle (\\moonR);
\\draw[thick] (0, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (0, 2.3) {New\\\\Moon};

% Phase 2: Waxing Crescent
\\fill[gray!70] (2, 3) circle (\\moonR);
\\fill[yellow!30] (2, 3) ++(90:\\moonR) arc (90:-90:\\moonR) arc (-90:90:0.2 and \\moonR);
\\draw[thick] (2, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (2, 2.3) {Waxing\\\\Crescent};

% Phase 3: First Quarter (right half lit)
\\fill[gray!70] (4, 3) circle (\\moonR);
\\fill[yellow!30] (4, 3) ++(90:\\moonR) arc (90:-90:\\moonR) -- cycle;
\\draw[thick] (4, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (4, 2.3) {First\\\\Quarter};

% Phase 4: Waxing Gibbous
\\fill[yellow!30] (6, 3) circle (\\moonR);
\\fill[gray!70] (6, 3) ++(-90:\\moonR) arc (-90:90:\\moonR) arc (90:-90:0.2 and \\moonR);
\\draw[thick] (6, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (6, 2.3) {Waxing\\\\Gibbous};

% Phase 5: Full Moon (all lit)
\\fill[yellow!30] (8, 3) circle (\\moonR);
\\draw[thick] (8, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (8, 2.3) {Full\\\\Moon};

% Phase 6: Waning Gibbous
\\fill[yellow!30] (10, 3) circle (\\moonR);
\\fill[gray!70] (10, 3) ++(90:\\moonR) arc (90:-90:\\moonR) arc (-90:90:0.2 and \\moonR);
\\draw[thick] (10, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (10, 2.3) {Waning\\\\Gibbous};

% Phase 7: Third Quarter (left half lit)
\\fill[gray!70] (12, 3) circle (\\moonR);
\\fill[yellow!30] (12, 3) ++(-90:\\moonR) arc (-90:90:\\moonR) -- cycle;
\\draw[thick] (12, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (12, 2.3) {Third\\\\Quarter};

% Phase 8: Waning Crescent
\\fill[gray!70] (14, 3) circle (\\moonR);
\\fill[yellow!30] (14, 3) ++(-90:\\moonR) arc (-90:90:\\moonR) arc (90:-90:0.2 and \\moonR);
\\draw[thick] (14, 3) circle (\\moonR);
\\node[below=0.4cm, font=\\scriptsize\\bfseries, align=center] at (14, 2.3) {Waning\\\\Crescent};

% Arrow showing cycle direction
\\draw[-{Stealth[length=3mm]}, very thick, blue!50] (0, 4.5) -- (14, 4.5);
\\node[font=\\scriptsize, blue!60, above=0.1cm] at (7, 4.5) {Cycle Direction};
\\end{tikzpicture}`,
}
