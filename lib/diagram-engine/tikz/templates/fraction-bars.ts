import type { TikzTemplate } from '../index'

export const FRACTION_BARS_TEMPLATE: TikzTemplate = {
  id: 'fraction-bars',
  name: 'Fraction Bars',
  keywords: [
    'fraction bar', 'fraction strip', 'fraction rectangle',
    'shade fraction bar', 'fraction model',
    'equivalent fraction bar', 'compare fractions',
    'adding fractions visual', 'subtracting fractions visual',
    'unlike denominators visual',
    'divide fraction', 'dividing fractions', 'fraction division',
    'divided by fraction',
    'visual model', 'by 1/2', 'by 1/3', 'by 1/4', 'by 2/3', 'by 3/4',
  ],
  gradeRange: [2, 5],
  topics: [22, 31, 32, 43, 54, 56],
  category: 'fraction-bars',
  referenceCode: `\\begin{tikzpicture}[scale=1.0]
  % Top bar: 2/3 shaded
  \\node[left, font=\\footnotesize] at (-0.3, 0.6) {$\\frac{2}{3}$};
  \\foreach \\x in {0,1,2} {
    \\ifnum\\x<2
      \\draw[thick, fill=blue!30] (\\x*2.67, 0) rectangle ({(\\x+1)*2.67}, 1.2);
    \\else
      \\draw[thick, fill=white] (\\x*2.67, 0) rectangle ({(\\x+1)*2.67}, 1.2);
    \\fi
    \\node at ({\\x*2.67+1.335}, 0.6) {$\\frac{1}{3}$};
  }
  % Bottom bar: 4/6 shaded (equivalent)
  \\node[left, font=\\footnotesize] at (-0.3, -1.0) {$\\frac{4}{6}$};
  \\foreach \\x in {0,...,5} {
    \\ifnum\\x<4
      \\draw[thick, fill=green!30] (\\x*1.333, -1.6) rectangle ({(\\x+1)*1.333}, -0.4);
    \\else
      \\draw[thick, fill=white] (\\x*1.333, -1.6) rectangle ({(\\x+1)*1.333}, -0.4);
    \\fi
    \\node[font=\\footnotesize] at ({\\x*1.333+0.667}, -1.0) {$\\frac{1}{6}$};
  }
  % Equal sign
  \\node[font=\\large] at (9, -0.2) {$=$};
\\end{tikzpicture}`,
}
