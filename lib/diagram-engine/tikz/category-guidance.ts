/**
 * Per-category rendering advice injected into the prompt when a topic is matched.
 * Each string is ~300-500 chars of topic-specific rules.
 */

export const CATEGORY_GUIDANCE: Record<string, string> = {
  'ten-frames': `TEN FRAMES:
- Draw a 2-row by 5-column grid with thick borders.
- Each cell should be 1cm x 1cm.
- Filled cells get a colored circle (radius 0.3cm) centered in the cell.
- Empty cells remain blank.
- Always label the count below the frame.
- For numbers > 10, use two ten frames side by side with 1cm gap.`,

  'number-bonds': `NUMBER BONDS (PART-PART-WHOLE):
- Draw 3 circles connected by lines in an inverted triangle.
- Top circle = whole, bottom-left = part A, bottom-right = part B.
- Each circle: minimum size=1.2cm, thick border.
- Use different fill colors: whole=blue!10, parts=green!10 and orange!10.
- Label "Whole" above top circle, "Part" below each bottom circle.
- Numbers inside circles should be bold.`,

  'number-lines': `NUMBER LINES:
- Draw a horizontal line with arrow tip at right end.
- Tick marks: thick, evenly spaced, labeled below with numbers.
- For hops/jumps: use curved arrows (bend left=50) above the line between tick positions.
- Label each hop with the operation (+3, -2, etc.) above the arrow.
- Highlight start/end points with filled red circles (radius 0.12).
- For fractions on number line: subdivide between integers with shorter tick marks.`,

  'bar-models': `BAR MODELS / TAPE DIAGRAMS:
- Draw rectangular bars divided into segments.
- Each segment labeled with its value inside.
- Total labeled above or to the right of the full bar.
- Use light fills (blue!15, green!15) to distinguish segments.
- Bar height ~1cm, total width ~10cm.
- For comparison: stack bars vertically with labels aligned left.`,

  'fraction-circles': `FRACTION CIRCLES:
- Draw a circle with radius ~1.5cm using \\draw[thick] (0,0) circle (r).
- Divide into N equal sectors using lines from center to circumference.
- Shade the numerator sectors using \\fill with arc paths.
- Each sector boundary: \\draw[thick] (0,0) -- (angle:r).
- Label the fraction centered below the circle.
- Use distinct colors: shaded=blue!30, unshaded=white.`,

  'fraction-bars': `FRACTION BARS:
- Draw a horizontal rectangle divided into N equal parts.
- Total width ~8cm, height ~1.2cm.
- Shade numerator parts from the left.
- Label each part with 1/N inside.
- Show the fraction value below the bar.
- For equivalent fractions: stack two bars vertically, aligned left, with different subdivisions.`,

  'area-models': `AREA MODELS FOR MULTIPLICATION:
- Draw a rectangle split by dashed lines into sub-rectangles.
- Label dimensions along top and left edges.
- Write partial products inside each sub-rectangle.
- Show the total equation below.
- Use light fill colors to distinguish sub-regions: blue!15, green!15.
- Keep labels outside the rectangle for dimensions, inside for products.`,

  'arrays-grids': `ARRAYS AND GRIDS:
- For multiplication arrays: draw rows x columns of filled circles with 0.5cm spacing.
- Row label on left, column label on top.
- Total equation below the array.
- For area grids (counting squares): draw a grid with thick borders and light fill.
- For percentage grids (10x10): use 0.4cm cells, shade the percentage portion.`,

  'place-value': `PLACE VALUE CHARTS:
- Draw a table with columns for each place value (Hundreds, Tens, Ones).
- Column headers in bold, centered above.
- Use vertical lines to separate columns, horizontal lines for rows.
- Show the digit in each column.
- Optionally draw base-10 blocks: large square=100, tall rectangle=10, small square=1.`,

  'shapes-basic': `BASIC SHAPES:
- Draw shapes with thick outlines and light fills.
- Label each side with its length.
- Mark right angles with small squares (0.2cm).
- For circles: label radius/diameter with an arrow line.
- Center the shape with its name below.
- Use colors to distinguish: blue!20 fill, black outlines.`,

  'shapes-classified': `CLASSIFIED SHAPES AND AREA CALCULATIONS:
- Draw the shape with all side lengths and angle measures labeled.
- Show classification criteria: equal sides marked with tick marks, equal angles with arcs.
- Use a label below with the shape name and classification.
- For triangle classification: show the type (equilateral, isosceles, scalene, right, obtuse, acute).
- For quadrilateral hierarchy: show the specific type and its properties.
- For AREA calculations: draw the shape with base and height labeled, show a dashed height line perpendicular to base, and include the formula (Area = base x height / 2 for triangles, Area = base x height for parallelograms, Area = (b1+b2)/2 x h for trapezoids).`,

  'angles-lines': `ANGLES AND LINES:
- Draw angle arcs with \\draw (start) arc (startAngle:endAngle:radius).
- Label degrees inside or just outside the arc.
- Mark right angles with a small square, not an arc.
- For parallel lines: use arrow marks (>>) on the lines.
- For perpendicular: show the right angle symbol at intersection.
- Use clear colors: angle arcs in blue, lines in black.`,

  'bar-graphs': `BAR GRAPHS:
- Draw axes with arrows at positive ends.
- Label x-axis below bars, y-axis on left with scale.
- Draw gridlines in gray!20 for readability.
- Bars: width ~0.8cm, gap ~0.3cm between bars, filled with distinct colors.
- Scale y-axis appropriately (start at 0, go above max value).
- Title above the graph.
- For scaled bar graphs: label the scale factor clearly.`,

  'line-plots': `LINE PLOTS AND LINE GRAPHS:
- LINE PLOTS (frequency): Draw a horizontal number line with labeled tick marks. Above each value, stack X marks or dots for each data point. Use \\node with $\\times$ symbol, stacked vertically.
- LINE GRAPHS (change over time): Draw x-axis (categories/time) and y-axis (values) with arrows. Plot data points as filled circles, then connect them with thick colored line segments using \\draw[thick, blue] (x1,y1) -- (x2,y2) -- ... Add gridlines in gray!15. Label axes and add a title above.
- Always label axes and include a descriptive title.`,

  'coordinate-plane': `COORDINATE PLANE:
- Draw x and y axes with arrows, labeled at ends.
- Add gridlines in gray!15 for reference.
- Label integer tick marks on both axes.
- Plot points as filled circles (radius 0.08) with coordinate labels in parentheses.
- For first quadrant only: axes from 0 to max value.
- For four quadrants: center at origin, extend equally in all directions.`,

  'factor-trees': `FACTOR TREES, ORDER OF OPERATIONS, AND EXPONENTS:
- FACTOR TREES: Root node at top with the composite number. Each level splits into two factors connected by lines. Prime factors at leaves with different color (green!20). Final prime factorization equation below the tree.
- ORDER OF OPERATIONS (PEMDAS): Draw an expression tree where each node is an operation (+, *, etc.) and leaves are numbers. Evaluate bottom-up showing partial results. OR show the expression with numbered circles above each operation indicating the order (1st, 2nd, 3rd...).
- EXPONENTS: For visual squares/cubes, draw a grid of unit squares (e.g., 2^4 = 16 as a 4x4 grid or show 2x2x2x2 as grouped arrays). Label the base, exponent, and result clearly.
- Space tree levels 1.5cm apart vertically, siblings 1.5cm apart horizontally.`,

  'long-division': `LONG DIVISION:
- Use the standard long division layout with the division bracket.
- Dividend inside, divisor outside left.
- Quotient above the bracket, aligned with corresponding digits.
- Show each step: multiply, subtract, bring down.
- Align all numbers by place value using fixed-width positioning.
- Use a clean monospace-like layout with TikZ nodes.`,

  'volume-nets': `VOLUME AND NETS:
- For unit cube stacks: draw an isometric-like view using offset rectangles.
- Label length, width, height with dimension arrows.
- Show the multiplication formula: l x w x h = V.
- For nets (unfolded 3D shapes): lay out all faces flat with fold lines dashed.
- Label which edges connect when folded.
- Use light fills to distinguish different faces.`,

  'tape-diagrams': `TAPE DIAGRAMS FOR RATIOS:
- Draw two horizontal tape strips stacked vertically.
- Divide each into equal-sized segments.
- Label each tape with the quantity name on the left.
- Number or label segments to show the ratio.
- Use different fill colors for each tape.
- Show the ratio relationship to the right or below.`,

  'double-number-lines': `DOUBLE NUMBER LINES:
- Draw two parallel horizontal number lines, one above the other.
- Top line: one quantity, bottom line: corresponding quantity.
- Align values vertically with dashed vertical connector lines.
- Label each line with the quantity name on the left.
- Use evenly spaced tick marks with values labeled below/above.`,

  'percentage-grids': `PERCENTAGE GRIDS (100-GRID):
- Draw a 10x10 grid of small squares (0.4cm each).
- Shade the percentage of squares from top-left, row by row.
- Use a distinct fill color (blue!30) for shaded cells.
- Label the percentage below the grid.
- Optionally label rows (10%, 20%, ...) on the right side.`,

  'box-plots': `BOX PLOTS:
- Draw a number line at the bottom with labeled tick marks.
- Box from Q1 to Q3, with a vertical line at the median.
- Whiskers extend from box to min and max values.
- Use thick lines for the box and whiskers.
- Label: min, Q1, median, Q3, max with values.
- Fill the box with a light color (blue!15).`,

  'dot-plots-histograms': `DOT PLOTS AND HISTOGRAMS:
- Dot plots: horizontal number line, stack filled circles above each value.
- Histograms: adjacent rectangular bars (no gaps), labeled x-axis with intervals, y-axis with frequency.
- Use distinct colors, label axes clearly.
- Show a title above the plot.`,

  'symmetry': `SYMMETRY DIAGRAMS:
- Draw the shape with a dashed line of symmetry.
- Use a distinct color (red, dashed) for the line of symmetry.
- Optionally shade one half differently to show the mirror relationship.
- Label "Line of Symmetry" along the dashed line.`,

  'tally-marks': `TALLY MARKS:
- Draw groups of 5: four vertical strokes with one diagonal crossing.
- Each stroke ~0.6cm tall, spaced 0.15cm apart.
- Diagonal stroke crosses the group at an angle.
- Space between groups: 0.4cm.
- Label the total to the right of all marks.`,

  'clock-faces': `CLOCK FACES:
- Draw a circle (radius ~2cm) with 12 hour marks.
- Label 12, 3, 6, 9 with numbers; other positions with short tick marks.
- Hour hand: shorter, thicker. Minute hand: longer, thinner.
- Both hands start from center.
- Label the time below the clock.
- For teaching minutes: add minute marks (60 small ticks around circumference).`,

  'coin-money': `COIN AND MONEY DIAGRAMS:
- Draw circles for coins with the denomination inside.
- Size coins proportionally: quarter > nickel > penny > dime (or use uniform size with clear labels).
- Label each coin below: "25 cents" or "quarter".
- For counting: arrange in a row with running total below.
- Use light fills to distinguish denominations.`,

  'measurement-ruler': `MEASUREMENT AND RULERS:
- Draw a ruler as a long rectangle with tick marks along the bottom edge.
- Label centimeter or inch marks with numbers below.
- Add half-unit marks as shorter ticks.
- Draw the object being measured above the ruler, aligned to 0.
- Show a measurement arrow with the length labeled above.
- For non-standard units (paper clips, cubes): draw the units lined up end-to-end with a count.`,

  'equation-balance': `EQUATION BALANCE / ALGEBRA MODELS:
- Draw a balance scale: triangle fulcrum, horizontal beam, two pans.
- Or draw an equation model: rectangular strips representing variables and constants.
- For balance: show objects/values on each side, indicate balance with = sign.
- For strip models: use different colors for variables (x) and constants (numbers).
- Label the equation below the visual model.`,

  'skip-counting': `SKIP COUNTING:
- Draw a number line with tick marks at regular intervals (0 to 30+).
- Highlight every Nth number with filled circles and bold labels.
- Draw curved hop arrows above the line connecting each Nth value.
- Label each hop with "+N" above the arrow.
- Use a bright color (blue or green) for the highlighted numbers.
- Unhighlighted ticks labeled in gray for context.`,

  '3d-shapes': `3D SHAPES:
- Draw isometric-style views using TikZ: cubes, rectangular prisms, cylinders, cones, spheres.
- Use light shading on visible faces with slightly different tints for top, front, side.
- Draw hidden edges as dashed lines. Visible edges solid and thick.
- Label each shape below with its name, face count, edge count, vertex count.
- For spheres: use a shading gradient. For cylinders: draw ellipses for top/bottom.
- Arrange 4-6 shapes in a grid layout.`,

  'perimeter-area-elementary': `PERIMETER AND AREA (ELEMENTARY):
- Draw the shape with labeled side lengths on each edge.
- For perimeter: use a colored border line and show the addition of all sides below.
- For area: fill the interior with a grid of unit squares, count labeled inside.
- Show the formula and calculation below the shape.
- Use blue for perimeter markings, green fill for area.
- Mark right angles with small squares.`,

  'money-coins': `MONEY AND COINS:
- Draw coins as circles with denomination text centered inside.
- Use relative sizing: quarter largest, dime smallest, nickel and penny between.
- Color-code: quarter=silver/gray, dime=silver, nickel=gray, penny=brown/copper fill.
- For bills: draw rectangles with "$1", "$5", "$10" etc. inside with green fill.
- Show running total with plus signs and equals at end.
- Arrange in a neat row with labels below each coin/bill.`,

  'even-odd-numbers': `EVEN AND ODD NUMBERS:
- Show numbers 1-10 in a row of circles.
- Even numbers: blue fill, paired dots below showing equal groups of 2.
- Odd numbers: red fill, paired dots with one leftover dot.
- Label "Even" and "Odd" columns or groups clearly.
- Include the rule: "Even numbers can be split into 2 equal groups."
- Use a two-column layout or number line with alternating colors.`,

  'multiplication-table': `MULTIPLICATION TABLE:
- Draw a grid table with row and column headers (1-12 or subset).
- Header row and column in a bold colored fill (blue for columns, green for rows).
- Products in the interior cells with alternating light fills for readability.
- Highlight the diagonal (perfect squares) with a distinct color like yellow.
- Cell size ~0.7cm for compact layout. Bold font for headers.
- Title above: "Multiplication Table".`,

  'expanded-form': `EXPANDED FORM:
- Show a number broken into place values using colored blocks or boxes.
- Each place value in a separate colored box: Hundreds=blue, Tens=green, Ones=orange.
- Write the expanded equation below: e.g., 300 + 40 + 5 = 345.
- Optionally draw base-10 blocks: flat=100, rod=10, unit=1.
- Arrows connecting each block group to its numeric value.
- Standard form on top, expanded form below.`,

  'elapsed-time': `ELAPSED TIME:
- Show two clock faces side by side: start time (left) and end time (right).
- Draw a timeline arrow below connecting them, labeled with elapsed duration.
- Clock radius ~1.5cm with 12, 3, 6, 9 labeled. Hour and minute hands drawn clearly.
- Label "Start" and "End" above each clock.
- For number line method: show hops of hours and minutes on a timeline.
- Use blue for start, red for end, green for elapsed duration.`,

  'probability-elementary': `PROBABILITY (ELEMENTARY):
- For spinners: draw a circle divided into colored sectors, each labeled with fraction.
- For dice: draw a cube face showing dots.
- For coin flips: draw two circles labeled H and T.
- Show a probability scale line from 0 (impossible) to 1 (certain).
- Label outcomes below. Use bright, distinct sector colors.
- For tree diagrams: simple two-level branching with fractions on branches.`,

  'pattern-sequences-elementary': `PATTERN AND SEQUENCES (ELEMENTARY):
- Show a sequence of shapes or numbers in a row with the pattern repeating 2-3 times.
- Use colors and shapes to make the repeating unit obvious: e.g., red circle, blue square, red circle, blue square.
- Draw a bracket below the repeating unit labeled "Pattern Unit".
- For growing patterns: show each term increasing (e.g., 1 block, 3 blocks, 5 blocks).
- Include a "What comes next?" box with a question mark.
- Label the rule below the pattern.`,

  'measurement-conversion': `MEASUREMENT CONVERSION:
- Draw a conversion ladder or staircase showing units from largest to smallest.
- For metric: km → m → cm → mm with x10 or x100 arrows between steps.
- For customary: miles → yards → feet → inches with conversion factors.
- Use colored boxes for each unit, arrows labeled with multiply/divide factors.
- Include a reference table below with common conversions.
- For capacity/weight: separate ladder diagrams with gallon, quart, pint, cup.`,

  'input-output-table': `INPUT-OUTPUT TABLE (FUNCTION TABLE):
- Draw a two-column table: Input (x) on left, Output (y) on right.
- Header row in colored fill with bold labels.
- 4-5 rows of values with the last row having a "?" for prediction.
- Show the rule/function in a box below: "Rule: multiply by 3 then add 1".
- Optionally draw a simple function machine between columns.
- Use blue for input column, green for output column.`,

  'rounding-number-line': `ROUNDING ON A NUMBER LINE:
- Draw a number line segment from the lower bound to upper bound (e.g., 40 to 50).
- Mark the midpoint with a dashed vertical line and label.
- Plot the number being rounded as a filled red circle.
- Draw an arrow from the number to the rounded value.
- Label "Rounds down" or "Rounds up" near the arrow.
- Highlight the closer end with a green circle.`,

  'comparing-ordering-numbers': `COMPARING AND ORDERING NUMBERS:
- For comparing: show two numbers in large boxes with >, <, or = symbol between them.
- Use a number line below with both numbers plotted as colored dots.
- For ordering: show numbers in boxes rearranged from least to greatest with arrows.
- Use place-value columns to show digit-by-digit comparison.
- Color-code: red for smaller, blue for larger, green for equal.
- Include the comparison statement below.`,

  // ========== Life Science ==========

  'life-cycles': `LIFE CYCLES (METAMORPHOSIS):
- Arrange stages in a circular/clockwise cycle with curved arrows connecting them.
- Each stage in a rounded box with distinct fill color and bold label.
- Number each stage (1, 2, 3, 4) with small circled numbers.
- For butterfly: Egg → Larva (Caterpillar) → Pupa (Chrysalis) → Adult (Butterfly).
- For frog: Egg → Tadpole → Tadpole with Legs → Adult Frog.
- For plant: Seed → Germination → Seedling → Adult Plant → Flower/Fruit → Seed.
- Title above the cycle, arrows in a bright color.`,

  'food-chains': `FOOD CHAINS AND FOOD WEBS:
- Arrange organisms left-to-right with thick arrows showing energy flow direction.
- Label each organism with its trophic level (Producer, Primary Consumer, etc.).
- Use distinct fill colors per level: green for producers, yellow for primary consumers, etc.
- Include the Sun as the energy source on the far left.
- For food webs: use a network layout with multiple crossing arrows.
- Keep arrows bold and clearly directional.`,

  'plant-anatomy': `PLANT ANATOMY:
- Draw a simplified plant with roots, stem, leaves, and flower.
- Use leader lines with arrowheads pointing to each labeled part.
- Labels placed outside the drawing for clarity.
- Ground line separating above-ground and below-ground parts.
- For flower parts: show petals, stamen, pistil, sepal with labels.
- Use green fills for leaves/stem, brown for roots, pink/yellow for flower.`,

  'animal-classification': `ANIMAL CLASSIFICATION:
- Draw a hierarchical tree diagram branching downward.
- Top node: "Animals" — branches to "Vertebrates" and "Invertebrates".
- Vertebrate sub-branches: Mammals, Birds, Fish, Reptiles, Amphibians.
- Use rounded boxes with distinct fill colors per group.
- Include 1-2 example animals below each category in gray text.
- Arrows pointing downward from parent to child nodes.`,

  'human-body-systems': `HUMAN BODY SYSTEMS:
- Use labeled boxes connected by arrows to show organ flow/connections.
- Each organ in a rounded box with light fill color and bold name.
- Brief function description next to each organ in gray text.
- Accessory organs connected with dashed arrows.
- For digestive: Mouth → Esophagus → Stomach → Small Intestine → Large Intestine.
- For respiratory: Nose → Trachea → Bronchi → Lungs.
- For circulatory: Heart → Arteries → Capillaries → Veins → Heart.`,

  'basic-cells': `BASIC CELLS (ELEMENTARY):
- Draw an oval or circle for the cell outline (cell membrane).
- Interior: large circle for nucleus, small ovals for mitochondria.
- Use fills: light red for membrane, light blue for nucleus, light green for organelles.
- Leader lines with arrows from labels outside to parts inside.
- For plant vs animal: show two cells side by side, highlight cell wall and chloroplasts in plant cell.
- Keep it simple — only 4-5 major parts for elementary level.`,

  'habitats-ecosystems': `HABITATS AND ECOSYSTEMS:
- Central node labeled "Habitats" with branches to 5-6 habitat types.
- Each habitat in a distinctly colored rounded box.
- Include 2-3 example organisms below each habitat in smaller text.
- Habitats: Ocean, Forest, Desert, Arctic, Rainforest, Grassland.
- Use connecting lines from center to each habitat.
- Title at top, clean layout with good spacing.`,

  'animal-adaptations': `ANIMAL ADAPTATIONS:
- Show 3-4 animals with labeled adaptation features using leader lines.
- Group into Structural (body parts), Behavioral (actions), Physiological (internal).
- Each animal in a rounded box with adaptation callouts pointing to features.
- Use colored labels: blue for structural, green for behavioral, orange for physiological.
- Include habitat context (desert, arctic, ocean) as background label.
- Brief description next to each adaptation.`,

  'plant-science': `PLANT SCIENCE:
- For photosynthesis: show a leaf with arrows for inputs (sunlight, CO2, water) and outputs (oxygen, glucose).
- Use green fills for leaves, yellow for sunlight arrows, blue for water.
- For plant parts functions: labeled diagram with roots, stem, leaves, flower.
- For seed germination: sequence of 4-5 stages from seed to seedling.
- For pollination: show flower with bee and pollen transfer arrows.
- Include clear labels and a title.`,

  // ========== Earth & Space Science ==========

  'water-cycle': `WATER CYCLE:
- Show landscape with water body at bottom, cloud above, mountain/land on side.
- Label and arrow for each process: Evaporation (up), Condensation (in cloud), Precipitation (down), Collection/Runoff.
- Use wavy arrows for evaporation, straight arrows for precipitation.
- Sun in corner as energy source.
- Blue fills for water, gray fills for clouds, green/brown for land.
- Large clear labels with fill=white background.`,

  'rock-cycle': `ROCK CYCLE:
- Three rock types in a triangle layout: Igneous, Sedimentary, Metamorphic.
- Magma at the bottom center.
- Arrows between all types labeled with processes (Weathering, Heat & Pressure, Melting, Cooling).
- Each rock type in a distinctly colored rounded box.
- Process labels on or near the arrows in smaller text.
- Bidirectional connections where applicable.`,

  'weather-clouds': `WEATHER AND CLOUD TYPES:
- Show altitude axis on the left (High, Middle, Low).
- Position cloud types at correct altitudes: Cirrus (high, wispy), Cumulus (middle, puffy), Stratus (low, flat), Cumulonimbus (tall).
- Draw each cloud with appropriate shape using fills and curves.
- Labels with cloud type name and brief description.
- Ground line at bottom with green fill.
- Rain drops from cumulonimbus to show storms.`,

  'solar-system': `SOLAR SYSTEM:
- Sun on the left (large yellow circle).
- Planets in order at increasing distances with orbital lines.
- Each planet as a filled circle with size roughly proportional.
- Labels above each planet with name in bold.
- Divide into Inner Planets (Rocky) and Outer Planets (Gas Giants) with a dashed line.
- Saturn should have a ring (ellipse).
- Scale cannot be accurate — use artistic spacing.`,

  'moon-phases': `MOON PHASES:
- Show 8 phases in a horizontal row: New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Third Quarter, Waning Crescent.
- Each phase as a circle with appropriate light/dark portions.
- Dark = gray fill, Light = yellow fill.
- Phase names below each circle in bold.
- Arrow above showing cycle direction.`,

  'earth-layers': `EARTH LAYERS:
- Draw concentric circles representing Crust, Mantle, Outer Core, Inner Core.
- Use distinct colors: brown (crust), yellow (mantle), orange (outer core), red (inner core).
- Cut away a wedge to reveal inner layers.
- Leader lines from right side pointing to each layer with thickness/depth labels.
- Title above the diagram.`,

  'seasons-earth-tilt': `SEASONS AND EARTH'S TILT:
- Sun in the center with yellow fill.
- Earth at 4 positions around an orbital ellipse (dashed): Summer, Fall, Winter, Spring.
- Each Earth shown as a small blue circle with a tilted axis line (red).
- Season labels near each Earth position with month in parentheses.
- Arrow on orbit showing direction of revolution.
- Note about 23.5 degree tilt at bottom.`,

  'landforms': `LANDFORMS:
- Show 4-6 landform types as simple cross-section drawings.
- Mountain: triangle with snow cap. Hill: rounded bump. Plateau: flat-topped elevation.
- Valley: depression between two mountains. Island: land surrounded by blue water.
- Each labeled below with landform name.
- Use brown/green fills for land, blue for water.
- Ground line connecting adjacent landforms.`,

  'erosion-weathering': `EROSION AND WEATHERING:
- Show two main categories: Weathering (breaking down) and Erosion (moving away).
- Branch Weathering into Mechanical and Chemical with examples below each.
- Branch Erosion into agents: Water, Wind, Ice with examples.
- Flow at bottom: Weathering → Erosion → Deposition.
- Use colored boxes and arrows.
- Examples in small gray text under each type.`,

  'earth-science': `EARTH SCIENCE (GENERAL):
- For plate tectonics: show cross-section with crust plates, arrows for convergent/divergent/transform boundaries.
- For soil layers: vertical cross-section with topsoil, subsoil, bedrock labeled with distinct brown fills.
- For fossils: show sediment layers with fossil shapes embedded, labeled by era.
- Use brown/earth tones. Leader lines for labels placed outside the diagram.
- Include a title and brief description for the specific topic.`,

  'natural-disasters': `NATURAL DISASTERS:
- For earthquakes: show cross-section with fault line, focus (underground), epicenter (surface), and seismic wave arrows radiating outward.
- For volcanoes: cross-section with magma chamber, conduit, crater, lava flow, ash cloud.
- For tornadoes: funnel shape from cloud to ground with rotation arrows.
- For hurricanes: top-down spiral view with eye labeled in center.
- Use dramatic but clear colors: red for lava, gray for ash, blue for water.
- Label all key features with leader lines.`,

  'day-night-rotation': `DAY AND NIGHT / EARTH ROTATION:
- Show Earth as a circle with half illuminated (yellow) and half dark (gray/blue).
- Sun on one side with yellow rays pointing toward Earth.
- Rotation arrow curving around Earth showing spin direction.
- Label "Day" on the lit side and "Night" on the dark side.
- Optionally show a stick figure on the surface transitioning from day to night.
- Include axis line tilted at 23.5 degrees.`,

  // ========== Physical Science ==========

  'five-senses': `FIVE SENSES:
- Central node (Brain) with 5 sense organs radiating outward.
- Each sense in a colored rounded box: Sight/Eyes, Hearing/Ears, Smell/Nose, Taste/Tongue, Touch/Skin.
- Lines connecting each sense to the central brain.
- Brief examples next to each sense in gray.
- Distinct colors per sense for easy identification.`,

  'states-of-matter': `STATES OF MATTER:
- Three states in a row: Solid, Liquid, Gas.
- Each in a large colored box with particle dots inside showing arrangement.
- Solid: tightly packed grid of dots. Liquid: loosely arranged dots. Gas: widely spread dots.
- Forward arrows above (Melting, Evaporation) labeled "Add Heat".
- Reverse arrows below (Freezing, Condensation) labeled "Remove Heat".
- Brief description of particle behavior inside each box.`,

  'simple-machines': `SIMPLE MACHINES:
- Show all 6 types in a grid layout (2 rows of 3 or 3 rows of 2).
- Lever: beam on triangular fulcrum with load and effort arrow.
- Wheel & Axle: circle with center dot. Pulley: wheel with rope and weight.
- Inclined Plane: triangle ramp with ball. Wedge: triangle point-up.
- Screw: vertical shaft with spiral threads.
- Each labeled below with type name.`,

  'magnets': `MAGNETS:
- Show bar magnets with N (red) and S (blue) poles clearly labeled.
- Attraction example: N facing S with green "Attract" arrows pulling together.
- Repulsion example: same poles facing with red "Repel" arrows pushing apart.
- Use thick outlines and white text on colored poles.
- Rule box at bottom: "Opposite poles attract, same poles repel."
- For field lines: curved lines from N to S outside the magnet.`,

  'light-optics': `LIGHT AND OPTICS (ELEMENTARY):
- For prism/spectrum: incoming white light ray, triangular prism, separated rainbow colors.
- Label each color: Red, Orange, Yellow, Green, Blue, Indigo, Violet.
- Color rays should fan out from the prism at different angles.
- For reflection: incoming ray, mirror surface, reflected ray with equal angles.
- For refraction: light ray bending as it enters water/glass.
- Use thick colored lines for light rays.`,

  'sound-waves': `SOUND WAVES:
- Draw sine waves on axes to show pitch and volume differences.
- High pitch: many cycles (short wavelength). Low pitch: few cycles (long wavelength).
- Loud: large amplitude. Soft: small amplitude.
- Show two waves stacked vertically for comparison.
- Label wavelength and amplitude with double-headed arrows.
- Use different colors for each wave.`,

  'energy-types': `ENERGY TYPES:
- Central "Energy" node with 6 types radiating outward.
- Types: Kinetic (motion), Potential (stored), Thermal (heat), Light (radiant), Chemical (food/fuel), Electrical.
- Each type in a distinctly colored rounded box.
- Brief real-world examples below each type in gray text.
- Lines connecting center to each type.
- For heat transfer: show Conduction, Convection, Radiation as labeled arrows.`,

  'forces-motion-elementary': `FORCES AND MOTION (ELEMENTARY):
- Show a central object (box) with force arrows in 4 directions.
- Push arrow from left (red). Pull arrow to right (green).
- Gravity arrow down (purple). Friction arrow opposing motion (orange).
- Ground line below the object.
- Key box at bottom explaining each force.
- Large, clear arrow labels. Arrows should be thick and bold.`,

  'simple-circuits': `SIMPLE CIRCUITS (ELEMENTARY):
- Draw a rectangular circuit path with wires in blue.
- Battery: two parallel lines (long=+, short=-) with label.
- Light bulb: circle with X inside.
- Switch: gap in wire with lever arm.
- Current flow arrows along the wire path.
- Labels for each component (Battery, Switch, Light Bulb).
- Keep it simple — no CircuiTikZ, just basic TikZ lines and shapes.`,

  'properties-of-matter': `PROPERTIES OF MATTER:
- Create a table or grid comparing properties: color, shape, size, texture, weight, flexibility.
- Show 3-4 example objects in labeled boxes with property values listed below each.
- For mass vs weight: show a balance scale with objects.
- For density: show objects floating/sinking in water with density values labeled.
- Use colored headers and clean grid lines.
- Include a summary box with key vocabulary definitions.`,

  'mixtures-solutions': `MIXTURES AND SOLUTIONS:
- For mixtures: draw a container with visible distinct particles (different colored dots).
- For solutions: draw a container with uniformly colored fill (dissolved = invisible particles).
- Show comparison side by side with labels: "Mixture" vs "Solution".
- For separation methods: show filter (funnel + paper), evaporation (beaker + heat), magnet.
- Use colored dots for particles: red and blue for mixture, uniform purple for solution.
- Label key terms with arrows.`,

  'static-electricity': `STATIC ELECTRICITY:
- Show objects with + and - charges as small symbols scattered on surface.
- For charging by friction: two objects rubbing with electron transfer arrows.
- Neutral object: equal + and - symbols. Charged object: excess of one type.
- For attraction/repulsion: show two charged objects with force arrows.
- Use red for positive, blue for negative charges.
- Include a balloon-and-hair or comb-and-paper example with labels.`,

  'shadow-light': `SHADOWS AND LIGHT:
- Draw a light source (sun or lamp) emitting rays as straight yellow lines.
- Object (opaque shape) blocking some rays.
- Shadow area behind the object as a gray filled region on the ground.
- Label: light source, object, shadow.
- Show that shadow size changes with distance (two examples at different distances).
- For transparent/translucent/opaque: three objects with varying amounts of light passing through.`,

  'plant-needs': `PLANT NEEDS:
- Draw a healthy plant in the center with roots visible below ground.
- Four arrows pointing inward labeled with needs: Sunlight (yellow arrow from above), Water (blue arrow from below), Air/CO2 (white arrow from side), Nutrients/Soil (brown arrow from below).
- Use green fills for the plant, brown for soil, blue wavy line for water.
- Optionally show a wilted plant without one need for comparison.
- Label each need clearly with bold text.`,

  'decomposition-cycle': `DECOMPOSITION CYCLE:
- Show a circular cycle: Living Organism → Dead Matter → Decomposers → Nutrients in Soil → Plant Growth → Living Organism.
- Each stage in a colored rounded box with arrows connecting clockwise.
- Decomposers stage: show mushroom, worm, bacteria icons or labels.
- Use earth tones: green for living, brown for dead matter, dark brown for soil.
- Include brief descriptions near each stage.
- Title "Decomposition Cycle" at the center or top.`,

  // ========== Social Studies ==========

  'timelines': `TIMELINES:
- Draw a long horizontal arrow (left to right = past to future).
- Evenly spaced tick marks with year/date labels below.
- Events in rounded boxes alternating above and below the timeline.
- Vertical connector lines from events to their tick marks.
- Different fill colors per event for visual distinction.
- Title above the timeline.`,

  'map-elements': `MAP ELEMENTS:
- Compass Rose: 4-pointed star shape with N, S, E, W labeled. Red for N, distinct colors for others.
- Include intermediate directions (NE, NW, SE, SW) in smaller text.
- Map Key/Legend: bordered box with symbol-label pairs.
- Latitude/Longitude: grid of horizontal and vertical lines with degree labels.
- Center dot in compass rose. Outer circle optional.`,

  'government-structure': `THREE BRANCHES OF GOVERNMENT:
- Three large colored boxes side by side: Legislative, Executive, Judicial.
- Below each: the institution (Congress, President, Supreme Court) and its function.
- Double-headed arrows between all three showing "Checks and Balances".
- Title above all three boxes.
- Use distinct colors: blue, red, green.`,

  'community-map': `COMMUNITY MAP:
- Grid of roads (horizontal and vertical gray rectangles).
- Buildings as labeled colored boxes positioned along roads.
- Include: School, Library, Park, Store, Hospital, Fire Station.
- Road names labeled.
- Small compass rose in corner.
- Trees or features in park area.`,

  'family-tree': `FAMILY TREE:
- Hierarchical tree: Grandparents at top, Parents in middle, Children at bottom.
- Each person in a rounded labeled box.
- Marriage lines (horizontal) connecting spouses.
- Vertical lines from parents down to children.
- Generation labels on the left side.
- Distinct colors per generation.`,

  'world-continents': `WORLD CONTINENTS:
- Draw simplified outlines of 7 continents arranged in approximate geographic positions.
- Label each continent with bold text centered inside or below.
- Use distinct fill colors per continent: green for Africa, blue for Europe, etc.
- Show major oceans labeled in blue italic text between continents.
- Include a compass rose in one corner and equator as a dashed horizontal line.
- Keep shapes simplified — recognizable but not detailed coastlines.`,

  'economics-elementary': `ECONOMICS (ELEMENTARY):
- For goods vs services: two-column layout with examples in colored boxes.
- For needs vs wants: two overlapping or side-by-side sections with labeled items.
- For supply/demand: simple graph with two crossing lines, labeled axes (Price, Quantity).
- For producers/consumers: flow diagram showing production → goods → consumers with arrows.
- Use green for money-related elements, blue for goods, orange for services.
- Keep vocabulary labels large and clear.`,

  'map-grid-coordinates': `MAP GRID COORDINATES:
- Draw a grid with lettered columns (A, B, C, D) and numbered rows (1, 2, 3, 4).
- Place 4-6 simple landmarks as colored icons at grid intersections.
- Label each landmark (School, Park, Store, etc.) with small text.
- Show an example coordinate pair highlighted: "(B, 3)" with an arrow to the location.
- Headers on top (letters) and left side (numbers) in bold colored boxes.
- Outer border around the entire grid.`,

  'natural-resources': `NATURAL RESOURCES:
- Divide into Renewable and Non-Renewable with two large colored sections.
- Renewable (green section): Sun, Wind, Water, Trees with simple icons or labeled boxes.
- Non-Renewable (red/orange section): Coal, Oil, Natural Gas, Minerals.
- Arrows or lines connecting each resource to its category header.
- Brief use description next to each resource in gray text.
- Title at top, clear separation between the two categories.`,

  'community-helpers': `COMMUNITY HELPERS:
- Show 6-8 community helper roles in a grid or radial layout.
- Each helper in a colored rounded box with role name in bold.
- Brief description of what they do below each name.
- Include: Police Officer, Firefighter, Doctor, Teacher, Mail Carrier, Librarian.
- Use distinct colors per helper for easy identification.
- Optionally include a simple tool/symbol icon description next to each.`,

  // ========== Language Arts / Graphic Organizers ==========

  'venn-diagram': `VENN DIAGRAM:
- Two overlapping circles with semi-transparent fills.
- Left circle: Topic A (blue). Right circle: Topic B (red).
- Overlap area: "Both" or "Similarities" (purple/mixed).
- Labels above each circle and above the overlap.
- Non-overlapping areas: "Only in A" and "Only in B".
- Large enough circles (radius ~2cm) for text inside.`,

  'plot-diagram': `PLOT DIAGRAM (STORY MOUNTAIN):
- Mountain shape: rising line from left, peak near right-center, descending line to right.
- Five points marked with dots: Exposition, Rising Action, Climax, Falling Action, Resolution.
- Labels at each point with brief descriptions in parentheses.
- Light fill under the mountain shape.
- Arrow indicators showing direction of rising/falling.`,

  'concept-web': `CONCEPT WEB / MIND MAP:
- Central circle with main idea/topic in bold.
- 4-6 smaller rounded boxes radiating outward for supporting details.
- Lines connecting center to each detail.
- Optional sub-details branching from supporting details.
- Distinct fill colors per detail box.
- Clean spacing between nodes.`,

  'sequence-chain': `SEQUENCE CHAIN:
- Horizontal chain of 4-5 rounded boxes: First, Next, Then, Finally.
- Large arrows between each box.
- Numbered circles above each box (1, 2, 3, 4).
- Detail boxes below each step for writing event descriptions.
- Distinct colors per step (blue, green, orange, red).`,

  't-chart': `T-CHART:
- Thick horizontal line at top, thick vertical line down the middle.
- Two column headers in colored boxes.
- Rows with light alternating fills and thin divider lines.
- Items listed in each column.
- Outer border around the entire chart.
- Clean, table-like layout.`,

  'kwl-chart': `KWL CHART:
- Three equal columns: K (Know), W (Want to Know), L (Learned).
- Each column header in a distinctly colored box.
- Subtitle under each header explaining the column.
- Lined writing area in each column (thin horizontal rules).
- Topic line above the chart.
- Outer border around all three columns.`,

  'cause-effect': `CAUSE AND EFFECT DIAGRAM:
- Two columns: Causes on left (blue boxes), Effects on right (red boxes).
- Thick arrows from each cause to its corresponding effect.
- "CAUSE" and "EFFECT" headers above each column.
- "leads to" or "so" labels on the arrows.
- 3-4 cause-effect pairs stacked vertically.
- Clear spacing between rows.`,

  'fact-opinion': `FACT VS OPINION:
- Two-column layout: "Fact" (blue header) on left, "Opinion" (orange header) on right.
- 3-4 example statements in each column inside rounded boxes.
- Facts marked with a checkmark icon, opinions with a thought bubble icon.
- Key difference box at bottom: "Facts can be proven, opinions are beliefs."
- Use light blue fill for fact boxes, light orange for opinion boxes.
- Clear separation line or gap between columns.`,

  'letter-format': `LETTER FORMAT:
- Show a letter template with labeled parts using leader lines.
- Parts: Date (top right), Greeting/Salutation, Body (indented paragraphs), Closing, Signature.
- Each part in a box or highlighted region with different light fills.
- Leader lines from right side pointing to each part with bold labels.
- For friendly vs formal: show two letters side by side highlighting differences.
- Use lined text areas to show where content goes.`,

  'text-structure': `TEXT STRUCTURE:
- Show 5 common structures as graphic organizer thumbnails in a grid.
- Chronological/Sequence: numbered chain of boxes with arrows.
- Compare/Contrast: Venn diagram. Cause/Effect: two columns with arrows.
- Problem/Solution: two boxes with arrow between. Description: central topic with radiating details.
- Label each structure below its thumbnail. Use distinct colors per structure.
- Title "Text Structures" above the grid.`,

  'word-parts': `WORD PARTS (PREFIXES, ROOTS, SUFFIXES):
- Draw a word broken into colored segments: prefix (blue), root (green), suffix (orange).
- Each segment in a box with the part labeled above and meaning labeled below.
- Show 2-3 example words stacked vertically.
- Arrows connecting prefix/suffix to their meanings.
- Include a combined meaning row showing how parts create the full word meaning.
- Use consistent color coding across all examples.`,

  'authors-purpose': `AUTHOR'S PURPOSE (PIE):
- Three large sections: Persuade, Inform, Entertain — arranged as pie chart or three columns.
- Each section with a distinct color: red for Persuade, blue for Inform, green for Entertain.
- Brief definition below each label.
- 2-3 example text types listed under each: "Ads, editorials" / "Textbooks, news" / "Stories, comics".
- Mnemonic "PIE" displayed prominently.
- Clean layout with title above.`,

  'genre-chart': `GENRE CHART:
- Grid or tree layout showing Fiction and Non-Fiction as two main branches.
- Fiction sub-genres: Fantasy, Mystery, Realistic Fiction, Science Fiction, Historical Fiction.
- Non-Fiction sub-genres: Biography, Informational, How-To, Autobiography.
- Each genre in a colored rounded box with a brief 3-4 word description.
- Connecting lines from main branches to sub-genres.
- Title "Literary Genres" at top.`,

  'parts-of-speech': `PARTS OF SPEECH:
- Show 8 parts of speech in a grid layout (2 rows of 4 or 4 rows of 2).
- Each part in a distinctly colored box: Noun (blue), Verb (red), Adjective (green), Adverb (orange), Pronoun (purple), Preposition (teal), Conjunction (pink), Interjection (yellow).
- Brief definition below each name. One example word in italics.
- For sentence diagrams: show a sentence with each word color-coded by part.
- Clean grid with consistent box sizes.`,

  'sentence-diagram': `SENTENCE DIAGRAM:
- Draw the baseline: a thick horizontal line for subject | verb division.
- Subject on left of vertical divider, predicate on right.
- Modifiers on diagonal lines slanting below the baseline.
- Direct object after a short vertical line on the baseline.
- Use thin black lines for structure, bold text for words.
- Label the parts: Subject, Verb, Direct Object, Adjective, Adverb.
- Keep it simple for elementary — max 6-8 word sentences.`,

  'story-elements': `STORY ELEMENTS:
- Show 5 elements in a visual layout: Characters, Setting, Plot, Conflict, Resolution.
- Each element in a colored rounded box arranged in a circle or grid.
- Brief definition or question prompt inside each box.
- Connecting lines showing relationships (Characters + Setting → Plot).
- Use distinct colors: blue for characters, green for setting, orange for plot, red for conflict, purple for resolution.
- Title "Story Elements" above.`,

  'text-features': `TEXT FEATURES:
- Show a mock page layout with labeled text features using leader lines.
- Include: Title, Heading, Subheading, Bold Words, Caption, Diagram, Table of Contents, Glossary, Index.
- Each feature highlighted with a colored box or underline on the mock page.
- Leader lines pointing to labels on the right side.
- Use a simple two-column layout: mock page on left, labels on right.
- Brief purpose description next to each label.`,

  'writing-process': `WRITING PROCESS:
- Show 5 steps in a horizontal flow or circular cycle.
- Steps: 1. Prewriting, 2. Drafting, 3. Revising, 4. Editing, 5. Publishing.
- Each step in a distinctly colored rounded box with bold label.
- Large arrows connecting steps left to right.
- Feedback arrow from Revising back to Drafting (dashed).
- Brief action verb description below each step (brainstorm, write, improve, fix, share).
- Numbered circles on each box.`,

  // ========== Health / Nutrition ==========

  'nutrition-plate': `MYPLATE / NUTRITION:
- Circle divided into 4 sections: Fruits, Vegetables, Grains, Protein.
- Small circle to the side for Dairy.
- Each section in its representative color: red (fruits), green (vegetables), orange (grains), purple (protein), blue (dairy).
- Labels inside each section in bold.
- For food pyramid: triangle divided into horizontal layers, widest at bottom.`,

  'dental-health': `DENTAL HEALTH / TOOTH TYPES:
- Show 4 types of teeth side by side: Incisor (flat top), Canine (pointed), Premolar (two bumps), Molar (multiple bumps).
- Each tooth as a tall rounded rectangle with characteristic top shape.
- Label below: tooth type name. Brief function description.
- Number badge showing how many of each type in an adult mouth.
- Simple, clear outlines — not anatomically detailed.`,

  'activity-pyramid': `ACTIVITY PYRAMID:
- Draw a triangle divided into 3-4 horizontal layers, widest at bottom.
- Bottom layer (green): "Every Day" activities — walking, playing, chores.
- Middle layer (yellow): "3-5 Times a Week" — sports, swimming, biking.
- Top layer (red): "Limit" — screen time, sitting.
- Labels inside each layer with examples. Layer colors from green to red (bottom to top).
- Title "Activity Pyramid" above. Brief time recommendations on the right.`,

  'feelings-emotions': `FEELINGS AND EMOTIONS:
- Show 6-8 emotion faces in a grid: Happy, Sad, Angry, Scared, Surprised, Disgusted, Worried, Excited.
- Each face as a circle with simple expression (eyes and mouth drawn with arcs).
- Emotion name in bold below each face.
- Use color coding: yellow for happy, blue for sad, red for angry, purple for scared.
- For emotion wheel: arrange emotions in a circle with related emotions adjacent.
- Keep expressions simple and clear — minimal detail.`,

  'hand-washing-steps': `HAND WASHING STEPS:
- Show 6 steps in a horizontal or 2x3 grid sequence.
- Steps: 1. Wet hands, 2. Apply soap, 3. Scrub 20 seconds, 4. Scrub between fingers, 5. Rinse, 6. Dry with towel.
- Each step in a numbered rounded box with brief label.
- Arrows connecting steps in order. Use blue fills for water steps, green for soap.
- Include a "20 seconds" callout on the scrubbing step.
- Simple, clean layout with large step numbers.`,

  // ========== Art / Music ==========

  'color-wheel': `COLOR WHEEL:
- 12 sectors in a circle, each filled with its color.
- Primary colors (Red, Yellow, Blue) at 0, 120, 240 degrees.
- Secondary colors (Orange, Green, Violet) between primaries.
- Tertiary colors between primary and secondary.
- White center circle. Labels for primary colors outside the wheel.
- Legend showing Primary, Secondary, Tertiary with descriptions.`,

  'musical-staff': `MUSICAL STAFF AND NOTES:
- Five horizontal staff lines drawn thick.
- Note values displayed on the staff: Whole (4 beats, open oval), Half (2 beats, open oval + stem), Quarter (1 beat, filled + stem), Eighth (1/2 beat, filled + stem + flag).
- Labels below each note with name and beat value.
- Line note names (EGBDF) labeled on the right.
- Treble clef symbol at the start.
- For rhythm: show note groupings with beams.`,

  // ========== STEM / Engineering ==========

  'scientific-method': `SCIENTIFIC METHOD:
- Vertical flowchart with 6 steps connected by downward arrows.
- Steps: 1. Ask a Question, 2. Do Research, 3. Make a Hypothesis, 4. Test with Experiment, 5. Analyze Results, 6. Draw Conclusion.
- Each step in a distinctly colored rounded box.
- Brief descriptions to the right of each step.
- Feedback loop (dashed arrow) from Conclusion back to Hypothesis if wrong.
- Title at the top.`,

  'engineering-design': `ENGINEERING DESIGN PROCESS:
- Circular/cycle layout with 5 steps: Ask, Imagine, Plan, Create, Improve.
- Curved arrows connecting steps in a cycle.
- Step numbers (1-5) next to each box.
- Brief descriptions near each step.
- Distinct colors per step.
- Title in the center or above.`,

  'data-table': `DATA TABLE:
- Standard table layout with header row in blue/colored fill.
- Column headers: Trial, Variable, Measurement, Notes.
- 5 numbered rows with alternating light gray fills.
- Average/Summary row at the bottom with yellow fill.
- Column divider lines and outer border drawn thick.
- Clean, grid-like layout.`,

  'classification-key': `CLASSIFICATION / DICHOTOMOUS KEY:
- Binary branching tree: each node is a Yes/No question (diamond shape).
- Terminal nodes are results/answers (rounded boxes).
- "Yes" and "No" labels on each branch.
- 2-3 levels of branching.
- Yellow fill for questions, colored fills for results.
- Title at top. Clean top-to-bottom flow.`,
}
