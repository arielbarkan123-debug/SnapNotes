import type { TikzTemplate } from '../index'

export const SENTENCE_DIAGRAM_TEMPLATE: TikzTemplate = {
  id: 'sentence-diagram',
  name: 'Sentence Diagram',
  keywords: [
    'sentence diagram', 'sentence structure',
    'subject predicate', 'subject and predicate',
    'simple sentence', 'compound sentence',
    'sentence parts', 'diagramming sentences',
  ],
  gradeRange: [3, 6],
  topics: [211],
  category: 'sentence-diagram',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.3]
% Title
\\node[font=\\large\\bfseries] at (5, 7) {Sentence Diagram};

% Sentence being diagrammed
\\node[font=\\footnotesize, fill=gray!10, draw=gray!40, thick, rounded corners=3pt, inner sep=4pt] at (5, 6.2) {Sentence: \\textbf{The dog ran quickly.}};

% === Main horizontal baseline ===
\\draw[very thick] (1, 4) -- (9, 4);

% Vertical divider between subject and predicate
\\draw[very thick] (5, 3.2) -- (5, 4.8);

% Subject words on the left
\\node[font=\\footnotesize\\bfseries] at (3, 4.3) {dog};

% Predicate words on the right
\\node[font=\\footnotesize\\bfseries] at (7, 4.3) {ran};

% === Modifier lines (diagonal slants below baseline) ===

% "The" slants below "dog"
\\draw[thick] (2, 4) -- (1.5, 3);
\\node[font=\\scriptsize] at (1.5, 3.3) {The};

% "quickly" slants below "ran"
\\draw[thick] (7.5, 4) -- (7, 3);
\\node[font=\\scriptsize] at (7.2, 3.3) {quickly};

% === Labels with arrows ===

% Subject label
\\draw[-{Stealth[length=2mm]}, thick, blue!60] (3, 5.3) -- (3, 4.6);
\\node[font=\\scriptsize\\bfseries, text=blue!60, fill=blue!10, rounded corners=2pt, inner sep=2pt] at (3, 5.5) {Subject};

% Predicate label
\\draw[-{Stealth[length=2mm]}, thick, red!60] (7, 5.3) -- (7, 4.6);
\\node[font=\\scriptsize\\bfseries, text=red!60, fill=red!10, rounded corners=2pt, inner sep=2pt] at (7, 5.5) {Predicate};

% Article label
\\draw[-{Stealth[length=2mm]}, thick, green!50!black] (0.5, 2.5) -- (1.3, 3.1);
\\node[font=\\scriptsize\\bfseries, text=green!50!black, fill=green!10, rounded corners=2pt, inner sep=2pt] at (0.5, 2.2) {Article};

% Adverb label
\\draw[-{Stealth[length=2mm]}, thick, orange!70!black] (8.5, 2.5) -- (7.5, 3.1);
\\node[font=\\scriptsize\\bfseries, text=orange!70!black, fill=orange!10, rounded corners=2pt, inner sep=2pt] at (8.5, 2.2) {Adverb};

% Divider label
\\node[font=\\scriptsize, text=gray!60, fill=white, inner sep=1pt] at (5, 4.8) {divider};

% Explanation box at bottom
\\draw[thick, gray!40, rounded corners=4pt, fill=yellow!5] (1, 0.5) rectangle (9, 2);
\\node[font=\\footnotesize\\bfseries] at (5, 1.7) {How to Read a Sentence Diagram};
\\node[font=\\scriptsize, align=left, anchor=west] at (1.3, 1.2) {1. Main line: subject (left) + predicate (right)};
\\node[font=\\scriptsize, align=left, anchor=west] at (1.3, 0.8) {2. Vertical line divides subject from predicate};
\\node[font=\\scriptsize, align=left, anchor=west] at (5.3, 1.2) {3. Slant lines show modifiers};
\\node[font=\\scriptsize, align=left, anchor=west] at (5.3, 0.8) {4. Articles and adverbs go below};
\\end{tikzpicture}`,
}
