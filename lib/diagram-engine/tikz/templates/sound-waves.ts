import type { TikzTemplate } from '../index'

export const SOUND_WAVES_TEMPLATE: TikzTemplate = {
  id: 'sound-waves',
  name: 'Sound Waves',
  keywords: [
    'sound wave', 'sound waves',
    'pitch amplitude', 'high pitch low pitch',
    'loud soft sound', 'frequency sound',
    'vibration sound', 'how sound travels',
    'wavelength sound', 'compression rarefaction',
    'volume amplitude',
  ],
  gradeRange: [3, 6],
  topics: [118],
  category: 'sound-waves',
  referenceCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.3]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Sound Waves: Pitch and Volume};

% Axes for Wave 1 (high pitch, loud)
\\draw[-{Stealth[length=2mm]}, thick] (0, 5) -- (10, 5);
\\draw[-{Stealth[length=2mm]}, thick] (0, 3.5) -- (0, 6.5);
\\node[font=\\footnotesize\\bfseries, blue!70, left] at (-0.3, 5) {Wave 1};

% High pitch wave (many cycles, large amplitude)
\\draw[very thick, blue!60, smooth] plot[domain=0:9.5, samples=100] (\\x, {5 + 1.2*sin(\\x*360/2)});

% Labels for wave 1
\\node[font=\\scriptsize, blue!60, above right] at (10, 5.5) {High Pitch};
\\node[font=\\scriptsize, blue!60, above right] at (10, 5) {Loud};

% Amplitude marker
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, red!60] (0.5, 5) -- (0.5, 6.2);
\\node[font=\\scriptsize, red!60, left] at (0.5, 5.6) {Amplitude};

% Wavelength marker
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, green!60!black] (1, 6.3) -- (3, 6.3);
\\node[font=\\scriptsize, green!60!black, above] at (2, 6.3) {Wavelength};

% Axes for Wave 2 (low pitch, soft)
\\draw[-{Stealth[length=2mm]}, thick] (0, 2) -- (10, 2);
\\draw[-{Stealth[length=2mm]}, thick] (0, 0.5) -- (0, 3.5);
\\node[font=\\footnotesize\\bfseries, orange!70, left] at (-0.3, 2) {Wave 2};

% Low pitch wave (fewer cycles, small amplitude)
\\draw[very thick, orange!60, smooth] plot[domain=0:9.5, samples=100] (\\x, {2 + 0.5*sin(\\x*360/5)});

% Labels for wave 2
\\node[font=\\scriptsize, orange!60, above right] at (10, 2.3) {Low Pitch};
\\node[font=\\scriptsize, orange!60, above right] at (10, 1.8) {Soft};
\\end{tikzpicture}`,
}
