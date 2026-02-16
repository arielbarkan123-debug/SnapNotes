import type { TikzTemplate } from '../index'

export const TEN_FRAMES_TEMPLATE: TikzTemplate = {
  id: 'ten-frames',
  name: 'Ten Frames',
  keywords: [
    'ten frame', 'ten-frame', 'tenframe', '10 frame', '10-frame',
    'counting to 10', 'counting to 20', 'how many dots',
    'fill in the frame', 'make ten', 'making ten',
    'counting objects', 'count the',
  ],
  gradeRange: [1, 2],
  topics: [1, 2],
  category: 'ten-frames',
  referenceCode: `\\begin{tikzpicture}[scale=0.8]
  % 2x5 grid
  \\foreach \\x in {0,...,4} {
    \\foreach \\y in {0,1} {
      \\draw[thick] (\\x,\\y) rectangle ++(1,1);
    }
  }
  % Filled dots (showing 7)
  \\foreach \\x in {0,...,4} {
    \\fill[blue!60] (\\x+0.5, 0.5) circle (0.3);
  }
  \\foreach \\x in {0,1} {
    \\fill[blue!60] (\\x+0.5, 1.5) circle (0.3);
  }
  % Label
  \\node[below, font=\\large] at (2.5, -0.3) {7 out of 10};
\\end{tikzpicture}`,
}
