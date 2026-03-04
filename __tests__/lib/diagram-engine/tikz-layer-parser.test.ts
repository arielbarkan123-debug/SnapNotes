import { parseTikzLayers, buildCumulativeStep } from '@/lib/diagram-engine/tikz-layer-parser'

const SAMPLE_TIKZ = `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === LAYER 1: Draw the object ===
\\draw[thick] (0,0) rectangle (2,1);
\\node at (1,0.5) {Box};
% === LAYER 2: Weight force ===
\\draw[-{Stealth},very thick,red] (1,0) -- (1,-1.5) node[below,fill=white] {$mg$};
% === LAYER 3: Normal force ===
\\draw[-{Stealth},very thick,blue] (1,1) -- (1,2.5) node[above,fill=white] {$N$};
% === LAYER 4: Friction ===
\\draw[-{Stealth},very thick,orange] (0,0.5) -- (-1.2,0.5) node[left,fill=white] {$f$};
\\end{tikzpicture}`

describe('parseTikzLayers', () => {
  it('extracts correct number of layers', () => {
    const result = parseTikzLayers(SAMPLE_TIKZ)
    expect(result.layers).toHaveLength(4)
    expect(result.preamble).toContain('\\usetikzlibrary{arrows.meta}')
  })

  it('each layer has correct number and content', () => {
    const result = parseTikzLayers(SAMPLE_TIKZ)
    expect(result.layers[0].layerNumber).toBe(1)
    expect(result.layers[0].description).toBe('Draw the object')
    expect(result.layers[0].code).toContain('rectangle')
    expect(result.layers[1].layerNumber).toBe(2)
    expect(result.layers[1].code).toContain('mg')
  })

  it('preserves tikzpicture options', () => {
    const result = parseTikzLayers(SAMPLE_TIKZ)
    expect(result.tikzpictureOptions).toBe('[scale=1.5]')
  })
})

describe('buildCumulativeStep', () => {
  it('step 1 includes only layer 1', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 1)
    expect(tikz).toContain('\\begin{tikzpicture}')
    expect(tikz).toContain('rectangle')
    expect(tikz).not.toContain('mg')
    expect(tikz).not.toContain('$N$')
  })

  it('step 3 includes layers 1, 2, and 3', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 3)
    expect(tikz).toContain('rectangle')
    expect(tikz).toContain('mg')
    expect(tikz).toContain('$N$')
    expect(tikz).not.toContain('$f$')
  })

  it('final step includes all layers', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 4)
    expect(tikz).toContain('rectangle')
    expect(tikz).toContain('mg')
    expect(tikz).toContain('$N$')
    expect(tikz).toContain('$f$')
  })

  it('includes preamble in output', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 1)
    expect(tikz).toContain('\\usetikzlibrary{arrows.meta}')
  })

  it('handles TikZ with no layers (returns full code)', () => {
    const noLayers = `\\begin{tikzpicture}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`
    const parsed = parseTikzLayers(noLayers)
    expect(parsed.layers).toHaveLength(1)
    const tikz = buildCumulativeStep(parsed, 1)
    expect(tikz).toContain('\\draw (0,0) -- (1,1)')
  })
})

// ─── Extra Edge Case Tests ────────────────────────────────────────────────────

describe('parseTikzLayers edge cases', () => {
  it('handles multiple blank lines between layers', () => {
    const tikzWithBlanks = `\\begin{tikzpicture}
% === LAYER 1: First ===
\\draw (0,0) -- (1,0);


% === LAYER 2: Second ===

\\draw (0,0) -- (0,1);

\\end{tikzpicture}`
    const result = parseTikzLayers(tikzWithBlanks)
    expect(result.layers).toHaveLength(2)
    expect(result.layers[0].code).toContain('\\draw (0,0) -- (1,0)')
    expect(result.layers[1].code).toContain('\\draw (0,0) -- (0,1)')
  })

  it('handles layer markers with extra whitespace', () => {
    const tikzExtraSpaces = `\\begin{tikzpicture}
%  ===  LAYER  1 :  Setup axes  ===
\\draw[->] (0,0) -- (5,0);
%  ===  LAYER  2 :  Plot curve  ===
\\draw (0,0) parabola (4,4);
\\end{tikzpicture}`
    const result = parseTikzLayers(tikzExtraSpaces)
    expect(result.layers).toHaveLength(2)
    expect(result.layers[0].description).toBe('Setup axes')
    expect(result.layers[1].description).toBe('Plot curve')
  })

  it('handles setup code before first numbered layer (layer 0)', () => {
    const tikzWithSetup = `\\begin{tikzpicture}
\\clip (-1,-1) rectangle (5,5);
\\draw[very thin, gray] (0,0) grid (4,4);
% === LAYER 1: Axes ===
\\draw[->] (0,0) -- (4.5,0) node[right] {$x$};
\\draw[->] (0,0) -- (0,4.5) node[above] {$y$};
% === LAYER 2: Plot ===
\\draw[thick, blue] plot[smooth] coordinates {(0,0) (1,1) (2,4) (3,2)};
\\end{tikzpicture}`
    const result = parseTikzLayers(tikzWithSetup)
    // Should have 3 items: layer 0 (setup), layer 1, layer 2
    expect(result.layers).toHaveLength(3)
    expect(result.layers[0].layerNumber).toBe(0)
    expect(result.layers[0].description).toBe('Setup')
    expect(result.layers[0].code).toContain('grid')
    expect(result.layers[1].layerNumber).toBe(1)
    expect(result.layers[2].layerNumber).toBe(2)
  })

  it('layer 0 setup code is always included in cumulative steps', () => {
    const tikzWithSetup = `\\begin{tikzpicture}
\\clip (-1,-1) rectangle (5,5);
% === LAYER 1: Axes ===
\\draw[->] (0,0) -- (4.5,0);
% === LAYER 2: Plot ===
\\draw[thick, blue] (0,0) -- (3,3);
\\end{tikzpicture}`
    const parsed = parseTikzLayers(tikzWithSetup)
    const step1 = buildCumulativeStep(parsed, 1)
    // Setup (layer 0) should be in step 1
    expect(step1).toContain('\\clip')
    expect(step1).toContain('\\draw[->]')
    expect(step1).not.toContain('blue')
  })

  it('handles tikzpicture with no options', () => {
    const tikzNoOpts = `\\begin{tikzpicture}
% === LAYER 1: Basic ===
\\draw (0,0) circle (1);
\\end{tikzpicture}`
    const result = parseTikzLayers(tikzNoOpts)
    expect(result.tikzpictureOptions).toBe('')
    expect(result.layers).toHaveLength(1)
  })

  it('handles multiple preamble lines', () => {
    const tikzMultiPreamble = `\\usetikzlibrary{arrows.meta}
\\usetikzlibrary{calc}
\\usetikzlibrary{patterns}
\\begin{tikzpicture}
% === LAYER 1: Shape ===
\\draw (0,0) rectangle (2,2);
\\end{tikzpicture}`
    const result = parseTikzLayers(tikzMultiPreamble)
    expect(result.preamble).toContain('arrows.meta')
    expect(result.preamble).toContain('calc')
    expect(result.preamble).toContain('patterns')
  })

  it('handles empty layer (marker followed immediately by another marker)', () => {
    const tikzEmptyLayer = `\\begin{tikzpicture}
% === LAYER 1: First ===
\\draw (0,0) -- (1,1);
% === LAYER 2: Empty layer ===
% === LAYER 3: Third ===
\\draw (2,2) circle (0.5);
\\end{tikzpicture}`
    const result = parseTikzLayers(tikzEmptyLayer)
    expect(result.layers).toHaveLength(3)
    expect(result.layers[0].layerNumber).toBe(1)
    expect(result.layers[1].layerNumber).toBe(2)
    expect(result.layers[1].code).toBe('')
    expect(result.layers[2].layerNumber).toBe(3)
    expect(result.layers[2].code).toContain('circle')
  })

  it('buildCumulativeStep clamps to max layer', () => {
    const tikz = `\\begin{tikzpicture}
% === LAYER 1: Only ===
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`
    const parsed = parseTikzLayers(tikz)
    // Requesting step 99 should still work (includes all available layers)
    const tikzOut = buildCumulativeStep(parsed, 99)
    expect(tikzOut).toContain('\\draw (0,0) -- (1,1)')
  })

  it('handles truncated input (missing \\end{tikzpicture})', () => {
    const truncated = `\\begin{tikzpicture}
% === LAYER 1: First ===
\\draw (0,0) -- (1,1);
% === LAYER 2: Second ===
\\draw (1,1) -- (2,0);`
    const result = parseTikzLayers(truncated)
    expect(result.layers).toHaveLength(2)
    expect(result.layers[0].code).toContain('\\draw (0,0) -- (1,1)')
    expect(result.layers[1].code).toContain('\\draw (1,1) -- (2,0)')
  })

  it('preserves complex tikzpicture options', () => {
    const tikz = `\\begin{tikzpicture}[scale=2, every node/.style={font=\\small}, thick]
% === LAYER 1: Grid ===
\\draw (0,0) grid (3,3);
\\end{tikzpicture}`
    const result = parseTikzLayers(tikz)
    expect(result.tikzpictureOptions).toBe('[scale=2, every node/.style={font=\\small}, thick]')
  })
})
