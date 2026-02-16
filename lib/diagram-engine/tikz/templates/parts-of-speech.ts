import type { TikzTemplate } from '../index'

export const PARTS_OF_SPEECH_TEMPLATE: TikzTemplate = {
  id: 'parts-of-speech',
  name: 'Parts of Speech',
  keywords: [
    'parts of speech', 'noun verb adjective',
    'adverb', 'pronoun',
    'parts of speech chart', 'grammar',
    'noun types', 'verb types',
    'adjective adverb', 'word types',
  ],
  gradeRange: [2, 5],
  topics: [210],
  category: 'parts-of-speech',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3,
  branch/.style={draw, very thick, fill=#1, minimum width=2.3cm, minimum height=0.8cm, align=center, font=\\footnotesize\\bfseries, rounded corners=4pt},
  example/.style={draw, thick, fill=#1, minimum width=1.6cm, minimum height=0.6cm, align=center, font=\\scriptsize, rounded corners=2pt},
  arrow/.style={-{Stealth[length=2.5mm,width=2mm]}, thick, gray!60}
]
% Title
\\node[draw, very thick, fill=gray!10, minimum width=3.5cm, minimum height=0.9cm, rounded corners=6pt, font=\\large\\bfseries] (title) at (5, 8.5) {Parts of Speech};

% === Four main branches ===

% Noun (blue)
\\node[branch=blue!20] (noun) at (1.5, 6.8) {Noun};
\\node[font=\\scriptsize, text=gray!60!black] at (1.5, 6.2) {person, place, thing};
\\node[example=blue!10] (n1) at (0.5, 5.3) {dog};
\\node[example=blue!10] (n2) at (1.5, 5.3) {school};
\\node[example=blue!10] (n3) at (2.5, 5.3) {book};

% Verb (red)
\\node[branch=red!20] (verb) at (4.5, 6.8) {Verb};
\\node[font=\\scriptsize, text=gray!60!black] at (4.5, 6.2) {action word};
\\node[example=red!10] (v1) at (3.5, 5.3) {run};
\\node[example=red!10] (v2) at (4.5, 5.3) {jump};
\\node[example=red!10] (v3) at (5.5, 5.3) {read};

% Adjective (green)
\\node[branch=green!25] (adj) at (7.5, 6.8) {Adjective};
\\node[font=\\scriptsize, text=gray!60!black] at (7.5, 6.2) {describes noun};
\\node[example=green!10] (a1) at (6.8, 5.3) {big};
\\node[example=green!10] (a2) at (7.8, 5.3) {red};
\\node[example=green!10] (a3) at (8.8, 5.3) {happy};

% Adverb (orange)
\\node[branch=orange!25] (adv) at (10, 6.8) {Adverb};
\\node[font=\\scriptsize, text=gray!60!black] at (10, 6.2) {describes verb};
\\node[example=orange!10] (d1) at (9.5, 5.3) {quickly};
\\node[example=orange!10] (d2) at (10.8, 5.3) {softly};

% Arrows from title to branches
\\draw[arrow] (title.south west) -- (noun.north);
\\draw[arrow] (title.south) +(-0.3,0) -- (verb.north);
\\draw[arrow] (title.south) +(0.3,0) -- (adj.north);
\\draw[arrow] (title.south east) -- (adv.north);

% Arrows to examples
\\draw[thick, blue!40] (noun.south) -- (n1.north);
\\draw[thick, blue!40] (noun.south) -- (n2.north);
\\draw[thick, blue!40] (noun.south) -- (n3.north);
\\draw[thick, red!40] (verb.south) -- (v1.north);
\\draw[thick, red!40] (verb.south) -- (v2.north);
\\draw[thick, red!40] (verb.south) -- (v3.north);
\\draw[thick, green!40] (adj.south) -- (a1.north);
\\draw[thick, green!40] (adj.south) -- (a2.north);
\\draw[thick, green!40] (adj.south) -- (a3.north);
\\draw[thick, orange!40] (adv.south) -- (d1.north);
\\draw[thick, orange!40] (adv.south) -- (d2.north);

% === Example sentence at bottom ===
\\draw[thick, gray!40, rounded corners=4pt] (0.5, 3.2) rectangle (10.5, 4.3);
\\node[font=\\footnotesize\\bfseries] at (5.5, 4) {Example Sentence:};

% Color-coded sentence: "The happy dog ran quickly."
\\node[font=\\footnotesize, fill=white, inner sep=2pt] at (2.5, 3.6) {The};
\\node[font=\\footnotesize\\bfseries, text=green!50!black, fill=green!10, inner sep=2pt, rounded corners=1pt] at (3.5, 3.6) {happy};
\\node[font=\\footnotesize\\bfseries, text=blue!60, fill=blue!10, inner sep=2pt, rounded corners=1pt] at (4.7, 3.6) {dog};
\\node[font=\\footnotesize\\bfseries, text=red!60, fill=red!10, inner sep=2pt, rounded corners=1pt] at (5.7, 3.6) {ran};
\\node[font=\\footnotesize\\bfseries, text=orange!70!black, fill=orange!10, inner sep=2pt, rounded corners=1pt] at (7, 3.6) {quickly};
\\node[font=\\footnotesize] at (7.8, 3.6) {.};

% Legend below sentence
\\node[font=\\scriptsize, text=blue!60] at (2, 2.8) {noun};
\\node[font=\\scriptsize, text=red!60] at (4, 2.8) {verb};
\\node[font=\\scriptsize, text=green!50!black] at (6, 2.8) {adjective};
\\node[font=\\scriptsize, text=orange!70!black] at (8.5, 2.8) {adverb};
\\end{tikzpicture}`,
}
