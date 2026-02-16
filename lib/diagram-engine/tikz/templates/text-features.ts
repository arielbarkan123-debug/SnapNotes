import type { TikzTemplate } from '../index'

export const TEXT_FEATURES_TEMPLATE: TikzTemplate = {
  id: 'text-features',
  name: 'Nonfiction Text Features',
  keywords: [
    'text features', 'table of contents',
    'index', 'glossary', 'heading',
    'caption', 'bold words', 'text feature',
    'nonfiction text features', 'labels in text',
  ],
  gradeRange: [2, 5],
  topics: [213],
  category: 'text-features',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning, decorations.pathmorphing}
\\begin{tikzpicture}[scale=1.3,
  label/.style={draw, thick, fill=#1, rounded corners=2pt, font=\\scriptsize\\bfseries, inner sep=3pt, align=center}
]
% Title
\\node[font=\\large\\bfseries] at (5, 9) {Nonfiction Text Features};

% === Mock book page (left side) ===
\\draw[very thick, fill=white] (0.5, 0.5) rectangle (6.5, 8);

% Title on page
\\node[font=\\footnotesize\\bfseries] (ptitle) at (3.5, 7.4) {Animals of the Ocean};

% Heading
\\node[font=\\scriptsize\\bfseries] (heading) at (2, 6.6) {Dolphins};

% Body text (wavy lines representing text)
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.3mm, segment length=3mm}] (1, 6) -- (5.5, 6);
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.3mm, segment length=3mm}] (1, 5.7) -- (5.5, 5.7);
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.3mm, segment length=3mm}] (1, 5.4) -- (4.5, 5.4);

% Bold word in text
\\node[draw, thick, fill=yellow!15, font=\\scriptsize\\bfseries, inner sep=2pt, rounded corners=1pt] (bold) at (2, 4.8) {mammal};
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.3mm, segment length=3mm}] (2.8, 4.8) -- (5.5, 4.8);
\\draw[thick, gray!40, decorate, decoration={snake, amplitude=0.3mm, segment length=3mm}] (1, 4.5) -- (5.5, 4.5);

% Image placeholder
\\draw[thick, fill=blue!10] (1.5, 2.2) rectangle (4.5, 4);
\\node[font=\\scriptsize, text=gray!60] at (3, 3.1) {[Photo of};
\\node[font=\\scriptsize, text=gray!60] at (3, 2.7) {dolphin]};

% Caption under image
\\node[font=\\scriptsize, text=gray!70!black] (caption) at (3, 1.8) {A dolphin swimming in the ocean.};

% Page number
\\node[font=\\scriptsize, text=gray!50] at (5.5, 0.8) {Page 12};

% === Right side: Labels with leader lines ===

% Title label
\\node[label=orange!20] (ltitle) at (9, 7.4) {Title};
\\draw[-{Stealth[length=2mm]}, thick, orange!60] (ltitle.west) -- (ptitle.east);

% Heading label
\\node[label=green!20] (lhead) at (9, 6.6) {Heading};
\\draw[-{Stealth[length=2mm]}, thick, green!50!black] (lhead.west) -- (6.6, 6.6);

% Body text label
\\node[label=gray!15] (lbody) at (9, 5.7) {Body Text};
\\draw[-{Stealth[length=2mm]}, thick, gray!50] (lbody.west) -- (6.6, 5.7);

% Bold word label
\\node[label=yellow!25] (lbold) at (9, 4.8) {Bold Word};
\\draw[-{Stealth[length=2mm]}, thick, yellow!60!black] (lbold.west) -- (6.6, 4.8);

% Image/Photo label
\\node[label=blue!15] (limg) at (9, 3.5) {Photograph};
\\draw[-{Stealth[length=2mm]}, thick, blue!50] (limg.west) -- (6.6, 3.5);

% Caption label
\\node[label=purple!15] (lcap) at (9, 1.8) {Caption};
\\draw[-{Stealth[length=2mm]}, thick, purple!50] (lcap.west) -- (6.6, 1.8);

% Descriptions next to labels
\\node[font=\\tiny, text=gray!60!black, anchor=west] at (10.2, 7.4) {Name of the book or chapter};
\\node[font=\\tiny, text=gray!60!black, anchor=west] at (10.2, 6.6) {Tells what a section is about};
\\node[font=\\tiny, text=gray!60!black, anchor=west] at (10.2, 5.7) {The main writing};
\\node[font=\\tiny, text=gray!60!black, anchor=west] at (10.2, 4.8) {Important vocabulary};
\\node[font=\\tiny, text=gray!60!black, anchor=west] at (10.2, 3.5) {A picture or illustration};
\\node[font=\\tiny, text=gray!60!black, anchor=west] at (10.2, 1.8) {Explains a picture};
\\end{tikzpicture}`,
}
