import type { TikzTemplate } from '../index'

export const STATIC_ELECTRICITY_TEMPLATE: TikzTemplate = {
  id: 'static-electricity',
  name: 'Static Electricity',
  keywords: [
    'static electricity', 'electric charge',
    'positive negative charge', 'attract repel charges',
    'static charge', 'balloon static',
    'electrons transfer', 'friction electricity',
  ],
  gradeRange: [3, 5],
  topics: [199],
  category: 'static-electricity',
  referenceCode: `\\usetikzlibrary{arrows.meta, positioning}
\\begin{tikzpicture}[scale=1.4,
  label/.style={font=\\footnotesize\\bfseries, fill=white, inner sep=3pt, rounded corners=2pt},
  arrow/.style={-{Stealth[length=3mm,width=2mm]}, very thick, #1},
  chargelabel/.style={font=\\large\\bfseries}
]
% Title
\\node[font=\\large\\bfseries] at (5, 8) {Static Electricity: Charges};

% ===== ROW 1: Like charges repel (positive + positive) =====
\\node[font=\\normalsize\\bfseries] at (0.3, 6.8) {1.};

% Left positive circle
\\fill[red!20] (1.5, 6.8) circle (0.6);
\\draw[very thick, red!60] (1.5, 6.8) circle (0.6);
\\node[chargelabel, red!70] at (1.5, 6.8) {+};

% Right positive circle
\\fill[red!20] (3.5, 6.8) circle (0.6);
\\draw[very thick, red!60] (3.5, 6.8) circle (0.6);
\\node[chargelabel, red!70] at (3.5, 6.8) {+};

% Repel arrows (pushing apart)
\\draw[arrow=red!60] (1.5, 6.8) -- (0.4, 6.8);
\\draw[arrow=red!60] (3.5, 6.8) -- (4.6, 6.8);

% Repel label
\\node[label, red!60] at (5.8, 6.8) {REPEL};
\\node[font=\\scriptsize, gray!70] at (5.8, 6.3) {Same charges};

% ===== ROW 2: Like charges repel (negative + negative) =====
\\node[font=\\normalsize\\bfseries] at (0.3, 5) {2.};

% Left negative circle
\\fill[blue!20] (1.5, 5) circle (0.6);
\\draw[very thick, blue!60] (1.5, 5) circle (0.6);
\\node[chargelabel, blue!70] at (1.5, 5) {--};

% Right negative circle
\\fill[blue!20] (3.5, 5) circle (0.6);
\\draw[very thick, blue!60] (3.5, 5) circle (0.6);
\\node[chargelabel, blue!70] at (3.5, 5) {--};

% Repel arrows (pushing apart)
\\draw[arrow=blue!60] (1.5, 5) -- (0.4, 5);
\\draw[arrow=blue!60] (3.5, 5) -- (4.6, 5);

% Repel label
\\node[label, blue!60] at (5.8, 5) {REPEL};
\\node[font=\\scriptsize, gray!70] at (5.8, 4.5) {Same charges};

% ===== ROW 3: Opposite charges attract (positive + negative) =====
\\node[font=\\normalsize\\bfseries] at (0.3, 3.2) {3.};

% Left positive circle
\\fill[red!20] (1.5, 3.2) circle (0.6);
\\draw[very thick, red!60] (1.5, 3.2) circle (0.6);
\\node[chargelabel, red!70] at (1.5, 3.2) {+};

% Right negative circle
\\fill[blue!20] (3.5, 3.2) circle (0.6);
\\draw[very thick, blue!60] (3.5, 3.2) circle (0.6);
\\node[chargelabel, blue!70] at (3.5, 3.2) {--};

% Attract arrows (pulling together)
\\draw[arrow=green!50!black] (1.5, 3.2) -- (2.2, 3.2);
\\draw[arrow=green!50!black] (3.5, 3.2) -- (2.8, 3.2);

% Attract label
\\node[label, green!50!black] at (5.8, 3.2) {ATTRACT};
\\node[font=\\scriptsize, gray!70] at (5.8, 2.7) {Opposite charges};

% ===== BOTTOM: Balloon + hair demonstration =====
\\draw[thick, dashed, gray!40] (0, 1.8) -- (10, 1.8);
\\node[font=\\normalsize\\bfseries] at (5, 1.4) {Balloon and Hair Example};

% Balloon shape (oval)
\\fill[purple!30] (2.5, 0) ellipse (0.8 and 1);
\\draw[very thick, purple!60] (2.5, 0) ellipse (0.8 and 1);
\\node[font=\\scriptsize\\bfseries, purple!70] at (2.5, 0.3) {Balloon};

% Negative charges on balloon
\\node[font=\\scriptsize\\bfseries, blue!70] at (2.1, -0.2) {--};
\\node[font=\\scriptsize\\bfseries, blue!70] at (2.5, -0.5) {--};
\\node[font=\\scriptsize\\bfseries, blue!70] at (2.9, -0.2) {--};
\\node[font=\\scriptsize\\bfseries, blue!70] at (2.3, 0.0) {--};

% Hair strands (reaching toward balloon)
\\draw[thick, brown!60] (4.5, 0.8) .. controls (4.0, 0.6) and (3.7, 0.5) .. (3.5, 0.3);
\\draw[thick, brown!60] (4.5, 0.5) .. controls (4.0, 0.3) and (3.7, 0.2) .. (3.5, 0.1);
\\draw[thick, brown!60] (4.5, 0.2) .. controls (4.0, 0.0) and (3.7, -0.1) .. (3.5, -0.1);
\\draw[thick, brown!60] (4.5, -0.1) .. controls (4.0, -0.2) and (3.7, -0.3) .. (3.5, -0.3);

% Head (simple circle)
\\fill[yellow!20] (5, 0.3) circle (0.5);
\\draw[very thick] (5, 0.3) circle (0.5);

% Transfer label
\\draw[arrow=orange!60] (4.2, -0.8) -- (3.0, -0.8);
\\node[font=\\scriptsize\\bfseries, orange!60, right] at (4.2, -0.8) {Electrons transfer};
\\node[font=\\scriptsize, align=center] at (5, -1.3) {Rubbing transfers electrons (--) to balloon};

% Rule at bottom
\\node[draw, thick, rounded corners=4pt, fill=yellow!10, font=\\footnotesize, align=center, inner sep=6pt] at (5, -2.2) {
  \\textbf{Rule:} Opposite charges attract, same charges repel
};
\\end{tikzpicture}`,
}
