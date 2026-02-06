# Comprehensive K-12 Visual Diagram Catalog

A curriculum-aligned catalog of every visual diagram type needed for K-12 education across Math, Physics, Chemistry, Biology, Geometry, and Economics. Organized by subject and grade band (Elementary 1-5, Middle School 6-8, High School 9-12).

**Curriculum alignment sources:** Common Core State Standards (CCSS-M), Next Generation Science Standards (NGSS), AP College Board course descriptions, Illustrative Mathematics, and state frameworks (California, Washington, Pennsylvania).

---

## Already Implemented in NoteSnap

Before planning new work, here is what already exists in the codebase:

| Component | File | Status |
|---|---|---|
| NumberLine | `components/math/NumberLine.tsx` | Exists |
| CoordinatePlane | `components/math/CoordinatePlane.tsx` | Exists |
| InteractiveCoordinatePlane | `components/math/InteractiveCoordinatePlane.tsx` | Exists |
| InteractiveGraph | `components/math/InteractiveGraph.tsx` | Exists |
| Triangle | `components/math/Triangle.tsx` | Exists |
| InequalityDiagram | `components/math/InequalityDiagram.tsx` | Exists |
| FreeBodyDiagram | `components/physics/FreeBodyDiagram.tsx` | Exists |
| InclinedPlane | `components/physics/InclinedPlane.tsx` | Exists |
| InteractiveInclinedPlane | `components/physics/InteractiveInclinedPlane.tsx` | Exists |
| InclinedPlaneSimulation | `components/physics/simulations/InclinedPlaneSimulation.tsx` | Exists |
| TriangleGeometry | `components/geometry/TriangleGeometry.tsx` | Exists |
| RegularPolygon | `components/geometry/RegularPolygon.tsx` | Exists |
| MathDiagramRenderer | `components/math/MathDiagramRenderer.tsx` | Exists |
| PhysicsDiagramRenderer | `components/physics/PhysicsDiagramRenderer.tsx` | Exists |
| GeometryDiagramRenderer | `components/geometry/GeometryDiagramRenderer.tsx` | Exists |
| FullScreenDiagramView | `components/diagrams/FullScreenDiagramView.tsx` | Exists |
| DiagramExplanationPanel | `components/diagrams/DiagramExplanationPanel.tsx` | Exists |

---

## 1. MATH (Grades 1-12)

### Elementary (Grades 1-5)

#### Grade 1-2: Counting & Basic Operations
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-E1 | **Counting Objects Array** | Grid of objects (dots, stars, blocks) arranged in rows/columns to visualize counting, addition, and subtraction within 20 | K.CC, 1.OA, 2.OA |
| M-E2 | **Ten Frame** | 2x5 grid where counters are placed to build number sense for quantities up to 10 (and extended to 20 with double ten frames) | K.OA.A.3, 1.OA.C.6 |
| M-E3 | **Part-Part-Whole Diagram** | Circle or box divided to show how a number decomposes into two parts (e.g., 7 = 3 + 4) | 1.OA.B.3, 1.OA.C.6 |
| M-E4 | **Basic Number Line (0-20)** | Horizontal line with tick marks for whole numbers; used to show addition as "jumps forward" and subtraction as "jumps backward" | 1.OA, 2.MD.B.6 |
| M-E5 | **Bar Model (Tape Diagram) - Addition/Subtraction** | Rectangular bars showing part-whole relationships for simple word problems (Singapore Math style) | 1.OA.A.1, 2.OA.A.1 |
| M-E6 | **Place Value Chart** | Columns for ones, tens, hundreds with blocks or digits showing how multi-digit numbers decompose | 1.NBT, 2.NBT |
| M-E7 | **Base-10 Blocks Diagram** | Visual representation of units (small cubes), rods (tens), flats (hundreds), and large cubes (thousands) for place value and multi-digit arithmetic | 2.NBT.B.5, 2.NBT.B.7 |
| M-E8 | **Picture Graph** | Simple graph using icons/pictures where each icon represents one unit; students read and create these | 1.MD.C.4, 2.MD.D.10 |
| M-E9 | **Bar Graph (single-unit scale)** | Vertical or horizontal bars representing categorical data; introduced with single-unit scale in grade 2, scaled in grade 3 | 2.MD.D.10, 3.MD.B.3 |

#### Grade 3-4: Fractions & Multiplication
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-E10 | **Fraction Circle (Pie Model)** | Circle divided into equal sectors to represent unit fractions (1/2, 1/3, 1/4, 1/6, 1/8); stackable pieces show equivalence and comparison | 3.NF.A.1, 3.NF.A.3 |
| M-E11 | **Fraction Bar (Strip/Rectangle Model)** | Horizontal rectangle divided into equal parts with shading; better than circles for comparing fractions with different denominators | 3.NF.A.1, 3.NF.A.3 |
| M-E12 | **Fraction Number Line** | Number line from 0 to 1 (or beyond) with fractions marked at equal intervals; critical for understanding fractions as numbers, not just parts of shapes | 3.NF.A.2 |
| M-E13 | **Multiplication Array** | Rectangular arrangement of dots/objects in rows and columns to model multiplication (e.g., 3 x 4 as 3 rows of 4) | 3.OA.A.1, 3.OA.A.3 |
| M-E14 | **Area Model for Multiplication** | Rectangle with dimensions labeled, partitioned to show partial products (e.g., 23 x 14 broken into 20x10, 20x4, 3x10, 3x4) | 4.NBT.B.5 |
| M-E15 | **Scaled Bar Graph / Line Plot** | Bar graphs with scales greater than 1; line plots with data on number lines (using fractions in grade 4-5) | 3.MD.B.3, 4.MD.B.4 |
| M-E16 | **Equivalent Fraction Model** | Side-by-side fraction bars or circles showing that 2/4 = 1/2, etc., with visual alignment | 3.NF.A.3, 4.NF.A.1 |
| M-E17 | **Mixed Number / Improper Fraction Model** | Multiple fraction bars/circles showing how 7/4 = 1 3/4 | 4.NF.B.3 |

#### Grade 5: Decimals, Volume & Operations
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-E18 | **Decimal Grid (Hundredths Grid)** | 10x10 grid where shading represents tenths and hundredths; connects fractions to decimals visually | 4.NF.C.5, 4.NF.C.6 |
| M-E19 | **Fraction Multiplication Area Model** | Rectangle with both dimensions representing fractions; the overlapping shaded area represents the product | 5.NF.B.4 |
| M-E20 | **Fraction Division Model** | Visual showing "how many groups of 1/3 fit into 2?" using number lines or bar models | 5.NF.B.7 |
| M-E21 | **Volume Model (Unit Cubes)** | 3D representation of rectangular prisms built from unit cubes to develop volume concept (l x w x h) | 5.MD.C.3, 5.MD.C.5 |
| M-E22 | **Order of Operations Tree** | Diagram showing expression evaluation order with branching for parentheses, exponents, multiplication/division, addition/subtraction | 5.OA.A.1 |
| M-E23 | **Coordinate Plane (Quadrant I only)** | First-quadrant grid for plotting ordered pairs; introduced in grade 5 | 5.G.A.1, 5.G.A.2 |

---

### Middle School (Grades 6-8)

#### Grade 6: Ratios, Rates & Statistics
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-M1 | **Double Number Line** | Two parallel number lines showing equivalent ratios (e.g., miles on top, hours on bottom) | 6.RP.A.3 |
| M-M2 | **Ratio Table** | Table of equivalent ratio pairs that can be extended by multiplication/division | 6.RP.A.3 |
| M-M3 | **Tape Diagram (Ratio Context)** | Bar models showing ratio relationships between two quantities (e.g., 3 blue to 5 red) | 6.RP.A.3 |
| M-M4 | **Full Coordinate Plane (4 Quadrants)** | Complete x-y plane with all four quadrants; students plot points with negative coordinates | 6.NS.C.6, 6.NS.C.8 |
| M-M5 | **Dot Plot (Line Plot)** | Number line with dots stacked above values to show distribution of a data set | 6.SP.B.4 |
| M-M6 | **Histogram** | Bar chart with consecutive intervals (bins) showing frequency distribution of numerical data | 6.SP.B.4 |
| M-M7 | **Box Plot (Box-and-Whisker)** | Five-number summary visualization (min, Q1, median, Q3, max) showing spread and skew | 6.SP.B.4 |
| M-M8 | **Stem-and-Leaf Plot** | Organized display of data where each value is split into a stem and leaf | 6.SP.B.4 |
| M-M9 | **Mean/Median/Mode Diagram** | Number line annotated with measures of center and their relationship to data distribution | 6.SP.B.5 |

#### Grade 7: Proportions, Probability & Expressions
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-M10 | **Proportional Relationship Graph** | Linear graph through origin showing constant rate of change (y = kx) | 7.RP.A.2 |
| M-M11 | **Percent Bar Model** | Bar model showing part/whole as percentage; used for markup, discount, tax, tip problems | 7.RP.A.3 |
| M-M12 | **Probability Tree Diagram** | Branching diagram showing outcomes of compound events with probabilities on each branch | 7.SP.C.8 |
| M-M13 | **Sample Space Diagram** | Table or list showing all possible outcomes for compound events (e.g., two dice) | 7.SP.C.8 |
| M-M14 | **Venn Diagram** | Overlapping circles showing set relationships; used for probability and classification | 7.SP.C.8 |
| M-M15 | **Net Diagrams (3D to 2D)** | Unfolded surfaces of 3D shapes (prisms, pyramids) for surface area calculation | 6.G.A.4, 7.G.B.6 |
| M-M16 | **Cross-Section Diagram** | 2D shape resulting from slicing a 3D figure with a plane | 7.G.A.3 |
| M-M17 | **Scale Drawing / Map** | Proportional diagram with scale factor showing enlarged or reduced version of a figure | 7.G.A.1 |

#### Grade 8: Linear Functions, Geometry & Irrational Numbers
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-M18 | **Linear Function Graph** | Line on coordinate plane with slope and y-intercept labeled; y = mx + b | 8.EE.B.5, 8.F.A.3 |
| M-M19 | **System of Equations Graph** | Two lines on same coordinate plane showing intersection point as solution | 8.EE.C.8 |
| M-M20 | **Slope Triangle** | Right triangle drawn on a line to visualize rise/run | 8.EE.B.6 |
| M-M21 | **Scatter Plot with Trend Line** | Data points plotted on coordinate plane with line of best fit showing correlation | 8.SP.A.1, 8.SP.A.2 |
| M-M22 | **Two-Way Frequency Table** | Table showing joint and marginal frequencies for two categorical variables | 8.SP.A.4 |
| M-M23 | **Pythagorean Theorem Diagram** | Right triangle with squares drawn on each side showing a^2 + b^2 = c^2 visually | 8.G.B.6, 8.G.B.7 |
| M-M24 | **Transformation Diagram** | Before/after figures showing translation, reflection, rotation, or dilation on coordinate plane | 8.G.A.1, 8.G.A.3 |
| M-M25 | **Irrational Number Line** | Number line showing placement of sqrt(2), pi, etc., between rational numbers | 8.NS.A.1, 8.NS.A.2 |
| M-M26 | **Exponent / Scientific Notation Scale** | Visual showing powers of 10 and how scientific notation relates to very large/small quantities | 8.EE.A.3 |

---

### High School (Grades 9-12)

#### Algebra I / Algebra II
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-H1 | **Quadratic Function Graph (Parabola)** | Parabola with vertex, axis of symmetry, roots, and direction labeled | HSF.IF.C.7a |
| M-H2 | **Polynomial Function Graph** | Graphs of degree 3+ polynomials showing end behavior, turning points, and zeros | HSF.IF.C.7c |
| M-H3 | **Exponential Growth/Decay Graph** | Curve showing exponential function with asymptote, growth factor, and key points | HSF.IF.C.7e, HSF.LE |
| M-H4 | **Logarithmic Function Graph** | Inverse of exponential; showing asymptote, domain restriction, and key points | HSF.IF.C.7e |
| M-H5 | **Absolute Value Function Graph** | V-shaped graph with vertex and piecewise behavior | HSF.IF.C.7b |
| M-H6 | **Radical / Square Root Function Graph** | Half-parabola showing domain restriction and transformation | HSF.IF.C.7b |
| M-H7 | **Piecewise Function Graph** | Graph composed of multiple function rules over different intervals | HSF.IF.C.7b |
| M-H8 | **Inequality Graph (1D)** | Number line with open/closed circles and shading showing solution set | HSA.REI.B.3 |
| M-H9 | **System of Inequalities (2D)** | Coordinate plane with shaded feasible region bounded by multiple linear inequalities | HSA.REI.D.12 |
| M-H10 | **Sequence Diagram** | Visual pattern or graph showing arithmetic and geometric sequences | HSF.IF.A.3, HSF.BF.A.2 |
| M-H11 | **Rational Function Graph** | Graph with vertical/horizontal asymptotes, holes, and end behavior | HSF.IF.C.7d |
| M-H12 | **Conic Sections Diagrams** | Graphs of circles, ellipses, parabolas, and hyperbolas with labeled foci, axes, and vertices | HSG.GPE.A.1-3 |
| M-H13 | **Complex Number Plane** | Argand diagram plotting complex numbers on real/imaginary axes | HSN.CN.B.4-6 |
| M-H14 | **Matrix Visualization** | Grid representation of matrix with labeled dimensions; transformation matrices shown visually | HSN.VM.C.6-12 |
| M-H15 | **Vector Diagram** | Arrows on coordinate plane showing magnitude and direction; vector addition (tip-to-tail and parallelogram methods) | HSN.VM.A.1-3 |

#### Precalculus / Calculus
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-H16 | **Trigonometric Function Graphs** | Sine, cosine, tangent curves with amplitude, period, phase shift, and midline labeled | HSF.TF.B.5 |
| M-H17 | **Unit Circle** | Circle with radius 1 on coordinate plane showing angle measures (degrees and radians) with corresponding (cos, sin) coordinates at key angles | HSF.TF.A.2-3 |
| M-H18 | **Polar Coordinate Graph** | Circular grid for plotting points and curves in polar form (r, theta); roses, cardioids, limacons | Precalculus |
| M-H19 | **Parametric Curve** | Path traced by (x(t), y(t)) as parameter t varies; with direction arrows | Precalculus |
| M-H20 | **Limit Visualization** | Function graph with approaching arrows showing left/right limits; removable vs. non-removable discontinuities | AP Calculus |
| M-H21 | **Derivative as Slope of Tangent Line** | Function curve with tangent line drawn at a point; secant lines approaching to illustrate limit definition | AP Calculus |
| M-H22 | **f, f', f'' Relationship Diagram** | Three stacked graphs showing original function, its first derivative, and second derivative with corresponding features labeled | AP Calculus |
| M-H23 | **Riemann Sum / Area Under Curve** | Function graph with rectangles (left, right, midpoint) approximating the definite integral | AP Calculus |
| M-H24 | **Solid of Revolution** | 3D visualization of a solid formed by rotating a 2D region around an axis (disk/washer/shell) | AP Calculus |

#### Statistics & Probability (Grades 9-12)
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| M-H25 | **Normal Distribution Curve** | Bell curve with mean, standard deviations, and area percentages (68-95-99.7 rule) | HSS.ID.A.4 |
| M-H26 | **Regression Line with Residuals** | Scatter plot with least-squares regression line and vertical residual segments | HSS.ID.B.6 |
| M-H27 | **Residual Plot** | Plot of residuals vs. predicted values to assess fit quality | HSS.ID.B.6b |
| M-H28 | **Probability Distribution Histogram** | Bar chart showing probability of each outcome for a discrete random variable | HSS.MD.A |
| M-H29 | **Binomial Distribution** | Histogram showing probability of k successes in n trials | AP Statistics |
| M-H30 | **Sampling Distribution** | Distribution of a sample statistic (e.g., sample mean) across many samples | AP Statistics |
| M-H31 | **Confidence Interval Diagram** | Number line showing point estimate with margin of error and confidence interval bounds | AP Statistics |
| M-H32 | **Hypothesis Test Diagram** | Normal curve with rejection region(s) shaded and test statistic marked | AP Statistics |

---

## 2. PHYSICS (Grades 9-12)

### Mechanics (Kinematics & Dynamics)
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-1 | **Position-Time (x-t) Graph** | Plot of position vs. time; slope = velocity. Constant velocity = straight line, acceleration = curve | HS-PS2-1, AP Physics 1 |
| P-2 | **Velocity-Time (v-t) Graph** | Plot of velocity vs. time; slope = acceleration, area under curve = displacement | HS-PS2-1, AP Physics 1 |
| P-3 | **Acceleration-Time (a-t) Graph** | Plot of acceleration vs. time; area under curve = change in velocity | AP Physics 1 |
| P-4 | **Kinematics Graph Set (x-t, v-t, a-t side-by-side)** | Three synchronized graphs showing the same motion from different perspectives; critical for conceptual understanding | AP Physics 1 |
| P-5 | **Free Body Diagram (FBD)** | Dot or box representing an object with labeled arrows for every force (gravity, normal, friction, tension, applied, air resistance) | HS-PS2-1, AP Physics 1 |
| P-6 | **Inclined Plane Diagram** | Object on a ramp with weight decomposed into parallel/perpendicular components; normal force and friction shown | AP Physics 1 |
| P-7 | **Projectile Motion Trajectory** | Parabolic path of a projectile with velocity vectors decomposed into horizontal and vertical components at multiple points | AP Physics 1 |
| P-8 | **Atwood Machine Diagram** | Two masses connected by a string over a pulley with FBDs for each mass | AP Physics 1 |
| P-9 | **Friction Diagram** | Surface with object showing static and kinetic friction directions relative to motion/applied force | AP Physics 1 |
| P-10 | **Tension / Pulley System** | Multiple pulleys with ropes showing mechanical advantage and force distribution | AP Physics 1 |

### Energy & Momentum
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-11 | **Energy Bar Chart (LOL Diagram)** | Bar chart showing KE, PE (gravitational, elastic), and thermal energy at different points in a system; visual conservation of energy | HS-PS3-1, AP Physics 1 |
| P-12 | **Potential Energy Diagram** | Graph of PE vs. position showing stable/unstable equilibrium, turning points, and kinetic energy as gap to total energy line | AP Physics 1 |
| P-13 | **Work-Energy Diagram** | Force vs. displacement graph where area under curve = work done | AP Physics 1 |
| P-14 | **Momentum Vector Diagram** | Before/after arrows showing momentum of objects in collisions (elastic, inelastic, perfectly inelastic) | HS-PS2-2, AP Physics 1 |
| P-15 | **Impulse-Momentum Graph** | Force vs. time graph where area under curve = impulse = change in momentum | AP Physics 1 |
| P-16 | **Collision Diagram** | Before/after snapshots showing two objects with velocity vectors pre- and post-collision | AP Physics 1 |

### Rotational Motion & Oscillations
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-17 | **Torque Diagram** | Lever arm with force applied at angle; showing r, F, and torque direction | AP Physics 1 |
| P-18 | **Angular Momentum Diagram** | Rotating object with angular velocity vector and moment of inertia visualization | AP Physics 1 |
| P-19 | **Simple Harmonic Motion (SHM) Diagram** | Mass-spring system or pendulum showing displacement, velocity, and acceleration at key positions | AP Physics 1 |
| P-20 | **SHM Graphs (x, v, a vs. t)** | Sinusoidal graphs of displacement, velocity, and acceleration for oscillating systems | AP Physics 1 |

### Waves & Sound
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-21 | **Transverse Wave Diagram** | Wave with labeled wavelength, amplitude, crest, trough, and direction of propagation vs. particle motion | HS-PS4-1 |
| P-22 | **Longitudinal Wave Diagram** | Compression and rarefaction regions in a medium (e.g., sound wave in air) with wavelength labeled | HS-PS4-1 |
| P-23 | **Standing Wave Diagram** | Wave with nodes and antinodes labeled; showing fundamental and harmonics on strings and in pipes | AP Physics 1 |
| P-24 | **Wave Superposition Diagram** | Two waves combining showing constructive and destructive interference | AP Physics 1 |
| P-25 | **Doppler Effect Diagram** | Moving source with compressed wavefronts ahead and stretched wavefronts behind | AP Physics 1 |

### Electricity & Magnetism
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-26 | **Circuit Diagram (Series)** | Schematic with battery, resistors, switches, and ammeter/voltmeter in series using standard symbols | HS-PS2-5, AP Physics 1/2 |
| P-27 | **Circuit Diagram (Parallel)** | Schematic showing parallel branches with current splitting and voltage equal across branches | AP Physics 1/2 |
| P-28 | **Circuit Diagram (Combination)** | Mixed series-parallel circuits with labeled components | AP Physics 1/2 |
| P-29 | **Electric Field Lines (Point Charges)** | Field lines radiating from positive charges and converging on negative charges; showing field direction and relative strength | HS-PS2-4, AP Physics 2 |
| P-30 | **Electric Field (Parallel Plates)** | Uniform field between charged plates with equipotential lines | AP Physics 2 |
| P-31 | **Magnetic Field Lines** | Field lines around a bar magnet, solenoid, or current-carrying wire (right-hand rule) | AP Physics 2 |
| P-32 | **Electromagnetic Induction Diagram** | Changing magnetic flux through a loop/coil showing induced EMF and current direction (Lenz's law) | AP Physics 2 |
| P-33 | **Coulomb's Law Diagram** | Two point charges with force vectors and distance labeled | AP Physics 1/2 |

### Optics
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-34 | **Ray Diagram (Concave Mirror)** | Principal axis, focal point, center of curvature, and three principal rays showing image formation | AP Physics 2 |
| P-35 | **Ray Diagram (Convex Mirror)** | Diverging rays appearing to come from virtual focal point | AP Physics 2 |
| P-36 | **Ray Diagram (Converging Lens)** | Three principal rays through a convex lens showing real/virtual image formation | AP Physics 2 |
| P-37 | **Ray Diagram (Diverging Lens)** | Three principal rays through a concave lens showing virtual image | AP Physics 2 |
| P-38 | **Snell's Law / Refraction Diagram** | Light ray bending at interface between two media with angles of incidence and refraction labeled | AP Physics 2 |
| P-39 | **Total Internal Reflection Diagram** | Light approaching a boundary at angles including the critical angle | AP Physics 2 |
| P-40 | **Electromagnetic Spectrum** | Visual showing all EM wave types (radio through gamma) with wavelength, frequency, and energy scales | HS-PS4-3 |

### Thermodynamics & Fluids
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-41 | **PV Diagram (Pressure-Volume)** | Graph showing thermodynamic processes (isothermal, isobaric, isochoric, adiabatic) with work as area under curve | AP Physics 2 |
| P-42 | **Heat Engine / Carnot Cycle Diagram** | PV diagram showing cyclic process with heat in, heat out, and net work | AP Physics 2 |
| P-43 | **Fluid Pressure Diagram** | Container with fluid showing pressure increasing with depth; Pascal's principle | AP Physics 2 |
| P-44 | **Bernoulli's Principle Diagram** | Fluid flowing through a constriction showing velocity and pressure changes | AP Physics 2 |

### Modern Physics
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| P-45 | **Photoelectric Effect Diagram** | Photons hitting metal surface ejecting electrons; with threshold frequency and KE vs. frequency graph | HS-PS4-3, AP Physics 2 |
| P-46 | **Energy Level Diagram (Atomic)** | Horizontal lines showing quantized electron energy levels with transition arrows (emission/absorption) | AP Physics 2 |
| P-47 | **Nuclear Decay Diagram** | Parent nucleus decaying into daughter nucleus plus alpha/beta/gamma radiation | HS-PS1-8 |
| P-48 | **de Broglie / Wave-Particle Duality** | Diagram showing particle exhibiting wave behavior (electron diffraction) | AP Physics 2 |

---

## 3. CHEMISTRY (Grades 9-12)

### Atomic Structure & Periodicity
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-1 | **Bohr Model Diagram** | Atom with concentric circular electron shells showing electrons in discrete energy levels | HS-PS1-1, AP Chem Unit 1 |
| C-2 | **Electron Cloud / Orbital Model** | Probability cloud shapes for s, p, d orbitals showing where electrons are most likely found | AP Chem Unit 1 |
| C-3 | **Electron Configuration Diagram** | Orbital box diagrams (showing up/down arrows in boxes) or shorthand notation with aufbau order | AP Chem Unit 1 |
| C-4 | **Photoelectron Spectroscopy (PES) Spectrum** | Bar graph showing binding energy vs. relative number of electrons; used to determine electron configuration | AP Chem Unit 1 |
| C-5 | **Periodic Table (Highlighted)** | Periodic table with color-coded regions showing trends (atomic radius, ionization energy, electronegativity, electron affinity) | HS-PS1-1, AP Chem Unit 1 |
| C-6 | **Periodic Trend Arrows** | Arrows overlaid on periodic table showing direction of increase for each periodic property | AP Chem Unit 1 |
| C-7 | **Ionization Energy Graph** | Plot of successive ionization energies showing large jumps when core electrons are removed | AP Chem Unit 1 |
| C-8 | **Mass Spectrometry Diagram** | Bar graph of mass-to-charge ratio vs. relative abundance for isotopes of an element | AP Chem Unit 1 |

### Bonding & Molecular Structure
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-9 | **Lewis Dot Structure** | Diagram showing valence electrons as dots around element symbols; bonds as shared pairs | HS-PS1-2, AP Chem Unit 2 |
| C-10 | **Lewis Structure (Molecules)** | Full Lewis structures for molecules showing bonding pairs, lone pairs, formal charges, and resonance structures | AP Chem Unit 2 |
| C-11 | **VSEPR Molecular Geometry** | 3D representations of molecular shapes (linear, bent, trigonal planar, tetrahedral, trigonal bipyramidal, octahedral) | AP Chem Unit 2 |
| C-12 | **Bond Polarity Diagram** | Molecule with partial charge symbols (delta+ and delta-) and dipole moment arrow | AP Chem Unit 2 |
| C-13 | **Ionic Crystal Lattice** | 3D arrangement of alternating cations and anions in a crystal structure (e.g., NaCl) | AP Chem Unit 2 |
| C-14 | **Metallic Bonding Diagram** | Sea of delocalized electrons surrounding positive metal ion cores | AP Chem Unit 2 |
| C-15 | **Orbital Hybridization Diagram** | Energy level diagrams showing sp, sp2, sp3 hybridization with orbital shapes | AP Chem Unit 2 |
| C-16 | **Sigma/Pi Bond Diagram** | Orbital overlap diagrams showing head-on (sigma) and lateral (pi) bond formation | AP Chem Unit 2 |

### Intermolecular Forces & States of Matter
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-17 | **Intermolecular Forces Diagram** | Molecular-level drawing showing London dispersion, dipole-dipole, and hydrogen bonding between molecules | AP Chem Unit 3 |
| C-18 | **Phase Diagram** | Pressure vs. temperature graph showing solid/liquid/gas regions, triple point, and critical point | AP Chem Unit 3 |
| C-19 | **Heating/Cooling Curve** | Temperature vs. time/energy graph showing plateaus during phase changes and slopes during single-phase heating | AP Chem Unit 3 |
| C-20 | **Kinetic Molecular Theory Diagram** | Gas particles in a container showing random motion, collisions, and velocity distribution | AP Chem Unit 3 |
| C-21 | **Maxwell-Boltzmann Distribution** | Graph of number of molecules vs. speed showing distribution at different temperatures | AP Chem Unit 3 |
| C-22 | **Solution Formation Diagram** | Molecular-level view of solute dissolving in solvent showing solvation/hydration | AP Chem Unit 3 |

### Chemical Reactions
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-23 | **Balanced Equation Particle Diagram** | Before/after molecular-level drawings showing conservation of atoms in a reaction | HS-PS1-7, AP Chem Unit 4 |
| C-24 | **Stoichiometry Mole Map** | Flow diagram showing relationships between grams, moles, particles, and liters (for gases) | AP Chem Unit 4 |
| C-25 | **Net Ionic Equation Diagram** | Visual showing spectator ions removed and only reacting species remaining | AP Chem Unit 4 |
| C-26 | **Oxidation State Diagram** | Reaction with oxidation numbers tracked showing electron transfer | AP Chem Unit 4 |

### Kinetics
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-27 | **Reaction Energy Profile (Potential Energy Diagram)** | Energy vs. reaction coordinate showing reactants, products, activation energy, and transition state | HS-PS1-5, AP Chem Unit 5 |
| C-28 | **Catalyzed vs. Uncatalyzed Energy Profile** | Two overlaid energy profiles showing lower activation energy with catalyst | AP Chem Unit 5 |
| C-29 | **Concentration vs. Time Graph** | Plots of [Reactant] or [Product] vs. time for zero, first, and second order reactions | AP Chem Unit 5 |
| C-30 | **Rate Law Graph (ln[A] and 1/[A] vs. t)** | Linearized plots used to determine reaction order | AP Chem Unit 5 |
| C-31 | **Reaction Mechanism Diagram** | Step-by-step pathway showing elementary steps, intermediates, and rate-determining step | AP Chem Unit 5 |

### Thermodynamics
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-32 | **Enthalpy Diagram** | Energy level diagram showing exothermic (products lower) and endothermic (products higher) reactions with delta-H | AP Chem Unit 6 |
| C-33 | **Hess's Law Diagram** | Multiple reaction pathways on an enthalpy diagram converging to same overall delta-H | AP Chem Unit 6 |
| C-34 | **Born-Haber Cycle** | Enthalpy diagram showing steps in forming an ionic compound from elements (lattice energy, ionization, electron affinity) | AP Chem Unit 6 |
| C-35 | **Calorimetry Setup Diagram** | Lab setup showing calorimeter components and heat flow direction | AP Chem Unit 6 |

### Equilibrium
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-36 | **Equilibrium Concentration Graph** | Concentration vs. time showing reactant decrease and product increase leveling off at equilibrium | AP Chem Unit 7 |
| C-37 | **Le Chatelier's Principle Diagram** | Before/after equilibrium state showing shift direction when stress is applied (concentration, pressure, temperature) | AP Chem Unit 7 |
| C-38 | **ICE Table Visualization** | Initial-Change-Equilibrium table for calculating equilibrium concentrations | AP Chem Unit 7 |
| C-39 | **Solubility Curve** | Graph of solubility (g/100mL) vs. temperature for multiple substances | AP Chem Unit 7 |

### Acids, Bases & Buffers
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-40 | **pH Scale Diagram** | Visual scale from 0-14 with common substances placed and color indicators | AP Chem Unit 8 |
| C-41 | **Titration Curve (Strong Acid/Strong Base)** | pH vs. volume of titrant added showing equivalence point at pH 7 | AP Chem Unit 8 |
| C-42 | **Titration Curve (Weak Acid/Strong Base)** | pH vs. volume showing buffer region, half-equivalence point, and equivalence point above pH 7 | AP Chem Unit 8 |
| C-43 | **Buffer Action Diagram** | Molecular-level view showing how buffer neutralizes added acid or base | AP Chem Unit 8 |

### Electrochemistry
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-44 | **Galvanic (Voltaic) Cell Diagram** | Two half-cells with electrodes, salt bridge, electron flow direction, and anode/cathode labels | AP Chem Unit 9 |
| C-45 | **Electrolytic Cell Diagram** | External power source driving non-spontaneous reaction; reversed anode/cathode vs. galvanic | AP Chem Unit 9 |
| C-46 | **Standard Reduction Potential Table/Diagram** | Visual ranking of half-reactions by reduction potential | AP Chem Unit 9 |

### Organic Chemistry (Introductory)
| # | Diagram Type | Description | AP/NGSS Alignment |
|---|---|---|---|
| C-47 | **Structural Formula** | Full structural formula showing all atoms and bonds in an organic molecule | AP Chem supplementary |
| C-48 | **Condensed Structural Formula** | Shorthand showing groups (CH3-CH2-OH) | AP Chem supplementary |
| C-49 | **Skeletal (Line-Angle) Formula** | Zigzag line representation where vertices = carbon atoms; used in organic chemistry | AP Chem supplementary |
| C-50 | **Functional Group Reference** | Chart showing common organic functional groups (hydroxyl, carboxyl, amino, carbonyl, etc.) | AP Chem supplementary |
| C-51 | **Isomer Comparison Diagram** | Side-by-side structures of structural and geometric (cis/trans) isomers | AP Chem supplementary |

---

## 4. BIOLOGY (Grades 9-12)

### Cell Biology
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-1 | **Animal Cell Diagram** | Labeled cross-section showing all major organelles: nucleus, mitochondria, ER (rough/smooth), Golgi, lysosomes, ribosomes, cell membrane, cytoplasm, centrioles | HS-LS1-2, AP Bio Unit 2 |
| B-2 | **Plant Cell Diagram** | Animal cell plus cell wall, chloroplasts, central vacuole, and plasmodesmata | HS-LS1-2, AP Bio Unit 2 |
| B-3 | **Prokaryotic Cell Diagram** | Bacterial cell showing cell wall, plasma membrane, ribosomes, nucleoid region, flagella, pili, and plasmids | AP Bio Unit 2 |
| B-4 | **Cell Membrane (Fluid Mosaic Model)** | Cross-section of phospholipid bilayer with embedded proteins, cholesterol, glycoproteins, and channel/transport proteins | HS-LS1-2, AP Bio Unit 2 |
| B-5 | **Organelle Detail: Mitochondrion** | Cutaway showing outer membrane, inner membrane (cristae), matrix, and intermembrane space | AP Bio Unit 3 |
| B-6 | **Organelle Detail: Chloroplast** | Cutaway showing outer/inner membranes, thylakoids, grana stacks, stroma, and lamellae | AP Bio Unit 3 |
| B-7 | **Organelle Detail: Nucleus** | Showing nuclear envelope (double membrane), nuclear pores, nucleolus, chromatin/chromosomes | AP Bio Unit 2 |
| B-8 | **Endomembrane System Diagram** | Flow diagram showing ER -> Golgi -> vesicles -> cell membrane pathway for protein processing | AP Bio Unit 2 |
| B-9 | **Osmosis / Diffusion Diagram** | Cell in hypotonic, isotonic, and hypertonic solutions showing water movement direction | AP Bio Unit 2 |
| B-10 | **Active vs. Passive Transport** | Membrane cross-section showing simple diffusion, facilitated diffusion, and active transport (with ATP) | AP Bio Unit 2 |

### DNA, RNA & Protein Synthesis
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-11 | **DNA Double Helix Structure** | 3D representation showing sugar-phosphate backbone, complementary base pairs (A-T, G-C), hydrogen bonds, antiparallel strands, and major/minor grooves | HS-LS1-1, AP Bio Unit 6 |
| B-12 | **DNA Replication Fork** | Diagram showing helicase, leading/lagging strands, Okazaki fragments, primase, DNA polymerase, and ligase | AP Bio Unit 6 |
| B-13 | **Transcription Diagram** | DNA template strand, RNA polymerase, growing mRNA strand, and promoter/terminator regions | HS-LS1-1, AP Bio Unit 6 |
| B-14 | **Translation Diagram** | Ribosome on mRNA with tRNA molecules carrying amino acids; showing codon-anticodon pairing and growing polypeptide chain | AP Bio Unit 6 |
| B-15 | **Central Dogma Flow Diagram** | DNA -> (transcription) -> mRNA -> (translation) -> Protein | AP Bio Unit 6 |
| B-16 | **Codon Chart / Genetic Code Table** | Circular or table format showing all 64 codons and their corresponding amino acids | AP Bio Unit 6 |
| B-17 | **Gene Expression Regulation (Operon Model)** | Lac operon or trp operon showing promoter, operator, structural genes, repressor, and inducer/corepressor | AP Bio Unit 6 |

### Cell Division
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-18 | **Cell Cycle Diagram** | Circular diagram showing G1, S, G2 (interphase) and M phase (mitosis + cytokinesis) with checkpoints | HS-LS1-4, AP Bio Unit 4 |
| B-19 | **Mitosis Phase Diagrams** | Sequential panels showing prophase, metaphase, anaphase, telophase, and cytokinesis with chromosomes, spindle fibers, and cell membrane changes | HS-LS1-4, AP Bio Unit 4 |
| B-20 | **Meiosis Phase Diagrams (I and II)** | Sequential panels for both meiosis I (homologous pairs) and meiosis II (sister chromatids) showing crossing over and independent assortment | HS-LS3-2, AP Bio Unit 5 |
| B-21 | **Mitosis vs. Meiosis Comparison** | Side-by-side diagram comparing the two processes, highlighting key differences (1 vs. 2 divisions, diploid vs. haploid, identical vs. unique) | AP Bio Unit 5 |
| B-22 | **Crossing Over Diagram** | Homologous chromosomes exchanging segments during prophase I of meiosis | AP Bio Unit 5 |
| B-23 | **Chromosome Structure** | Diagram showing DNA -> nucleosome -> chromatin fiber -> chromosome with centromere, chromatids, and telomeres labeled | AP Bio Unit 4 |

### Genetics
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-24 | **Punnett Square (Monohybrid)** | 2x2 grid showing parental gamete combinations for one trait; predicting genotype and phenotype ratios | HS-LS3-3, AP Bio Unit 5 |
| B-25 | **Punnett Square (Dihybrid)** | 4x4 grid for two independent traits showing 9:3:3:1 phenotype ratio | AP Bio Unit 5 |
| B-26 | **Pedigree Chart** | Family tree diagram using circles (female) and squares (male), filled = affected, showing inheritance patterns (autosomal dominant/recessive, X-linked) | HS-LS3-3, AP Bio Unit 5 |
| B-27 | **Karyotype Diagram** | Organized display of all chromosome pairs from a cell, arranged by size and centromere position | AP Bio Unit 5 |
| B-28 | **Incomplete/Codominance Diagram** | Modified Punnett squares showing blended or dual-expressed phenotypes | AP Bio Unit 5 |
| B-29 | **Sex-Linked Inheritance Diagram** | X-chromosome Punnett square showing carrier females and affected males | AP Bio Unit 5 |
| B-30 | **Gel Electrophoresis Diagram** | Labeled gel showing DNA fragments separated by size with wells, bands, and size ladder | AP Bio Unit 6 |

### Metabolism (Photosynthesis & Respiration)
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-31 | **Photosynthesis Overview Diagram** | Chloroplast showing light reactions (thylakoid) and Calvin cycle (stroma) with inputs/outputs | HS-LS1-5, AP Bio Unit 3 |
| B-32 | **Light Reactions Diagram** | Thylakoid membrane showing Photosystem II, electron transport chain, Photosystem I, and ATP synthase with H+ gradient | AP Bio Unit 3 |
| B-33 | **Calvin Cycle Diagram** | Circular pathway showing carbon fixation (RuBisCO), reduction, and regeneration of RuBP with CO2 input and G3P output | AP Bio Unit 3 |
| B-34 | **Cellular Respiration Overview** | Flow diagram: Glycolysis (cytoplasm) -> Krebs Cycle (matrix) -> Oxidative Phosphorylation (inner membrane) with ATP totals | HS-LS1-7, AP Bio Unit 3 |
| B-35 | **Electron Transport Chain & Chemiosmosis** | Inner mitochondrial membrane showing complexes I-IV, H+ gradient, and ATP synthase | AP Bio Unit 3 |
| B-36 | **Photosynthesis vs. Respiration Comparison** | Side-by-side diagram showing how products of one process are inputs to the other | HS-LS1-5 |
| B-37 | **Fermentation Pathways** | Diagram showing alcoholic and lactic acid fermentation branching from glycolysis when O2 is absent | AP Bio Unit 3 |

### Ecology
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-38 | **Food Chain** | Linear sequence: producer -> primary consumer -> secondary consumer -> tertiary consumer -> decomposer | HS-LS2-3, AP Bio Unit 8 |
| B-39 | **Food Web** | Complex interconnected feeding relationships in an ecosystem showing multiple trophic pathways | HS-LS2-3, AP Bio Unit 8 |
| B-40 | **Energy Pyramid (Trophic Levels)** | Triangular diagram showing 10% energy transfer between levels; producers at base | HS-LS2-4, AP Bio Unit 8 |
| B-41 | **Carbon Cycle Diagram** | Flow diagram showing carbon movement through atmosphere, organisms, oceans, and fossil fuels | HS-LS2-5, AP Bio Unit 8 |
| B-42 | **Nitrogen Cycle Diagram** | Flow showing nitrogen fixation, nitrification, assimilation, ammonification, and denitrification | AP Bio Unit 8 |
| B-43 | **Water Cycle Diagram** | Evaporation, condensation, precipitation, runoff, infiltration, and transpiration | HS-ESS2-5 |
| B-44 | **Population Growth Curves** | Exponential (J-curve) and logistic (S-curve) growth with carrying capacity labeled | AP Bio Unit 8 |
| B-45 | **Ecological Succession Diagram** | Timeline showing primary or secondary succession from bare rock/disturbance to climax community | AP Bio Unit 8 |

### Human Body Systems
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-46 | **Circulatory System Diagram** | Heart chambers, major blood vessels, and blood flow pathway through pulmonary and systemic circuits | HS-LS1-2 |
| B-47 | **Heart Cross-Section** | Four chambers, valves, septum, and great vessels (aorta, pulmonary arteries/veins, vena cava) with oxygenated/deoxygenated blood color-coded | HS-LS1-2 |
| B-48 | **Respiratory System Diagram** | Nasal cavity, trachea, bronchi, bronchioles, and alveoli with gas exchange detail | HS-LS1-2 |
| B-49 | **Nervous System Diagram** | Brain regions, spinal cord, and peripheral nerves; or detailed neuron diagram (dendrites, cell body, axon, myelin, synapse) | HS-LS1-2 |
| B-50 | **Neuron & Synapse Detail** | Action potential propagation, neurotransmitter release across synaptic cleft, and receptor binding | AP Bio Unit 4 |
| B-51 | **Digestive System Diagram** | Labeled GI tract from mouth to anus with accessory organs (liver, pancreas, gallbladder) | HS-LS1-2 |
| B-52 | **Immune System Diagram** | Innate vs. adaptive immunity; showing antigens, antibodies, B-cells, T-cells, and memory cells | AP Bio Unit 4 |
| B-53 | **Endocrine System / Feedback Loop** | Negative feedback diagram (e.g., thyroid hormone regulation) showing gland, hormone, target, and feedback pathway | AP Bio Unit 4 |

### Evolution
| # | Diagram Type | Description | NGSS/AP Alignment |
|---|---|---|---|
| B-54 | **Phylogenetic Tree (Cladogram)** | Branching diagram showing evolutionary relationships based on shared derived characteristics | HS-LS4-1, AP Bio Unit 7 |
| B-55 | **Homologous Structures Diagram** | Side-by-side limb comparisons (human arm, whale flipper, bat wing) showing common bone structure | HS-LS4-2 |
| B-56 | **Natural Selection Diagram** | Population with variation -> selective pressure -> differential survival/reproduction -> adapted population | HS-LS4-3, AP Bio Unit 7 |
| B-57 | **Hardy-Weinberg Diagram** | Allele frequency model showing conditions for genetic equilibrium and factors that disrupt it | AP Bio Unit 7 |
| B-58 | **Speciation Diagram** | Geographic/reproductive isolation leading to divergence of populations into new species | AP Bio Unit 7 |
| B-59 | **Geologic Time Scale** | Timeline showing eons, eras, periods with key evolutionary events | HS-LS4-1 |

---

## 5. GEOMETRY (Grades 7-12)

### Middle School Geometry (Grades 7-8)
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| G-M1 | **Angle Types Diagram** | Visual showing acute, right, obtuse, straight, and reflex angles with degree measures | 7.G.B.5 |
| G-M2 | **Complementary & Supplementary Angles** | Two angles summing to 90 or 180 degrees with visual representation | 7.G.B.5 |
| G-M3 | **Vertical Angles** | Two intersecting lines forming four angles with vertical pairs highlighted as equal | 7.G.B.5 |
| G-M4 | **Parallel Lines Cut by Transversal** | Diagram showing all eight angle relationships: corresponding, alternate interior, alternate exterior, co-interior (same-side interior) | 8.G.A.5 |
| G-M5 | **Triangle Angle Sum** | Triangle with all three interior angles labeled summing to 180 degrees | 8.G.A.5 |
| G-M6 | **Exterior Angle Theorem** | Triangle with exterior angle equal to sum of two non-adjacent interior angles | 8.G.A.5 |
| G-M7 | **Translation on Coordinate Plane** | Figure and its image after sliding by a vector; corresponding points connected | 8.G.A.1 |
| G-M8 | **Reflection on Coordinate Plane** | Figure and its mirror image across a line of reflection (x-axis, y-axis, y=x, etc.) | 8.G.A.1 |
| G-M9 | **Rotation on Coordinate Plane** | Figure rotated around a center point by a specified angle (90, 180, 270 degrees) | 8.G.A.1 |
| G-M10 | **Dilation on Coordinate Plane** | Figure enlarged or reduced from a center of dilation with scale factor | 8.G.A.3 |
| G-M11 | **Congruence via Transformations** | Two figures shown to be congruent through a sequence of rigid motions | 8.G.A.2 |
| G-M12 | **Similarity via Transformations** | Two figures shown to be similar through a sequence of transformations including dilation | 8.G.A.4 |
| G-M13 | **Pythagorean Theorem Visual Proof** | Three squares on the sides of a right triangle with area relationship demonstrated | 8.G.B.6 |
| G-M14 | **3D Shape with Net** | 3D figure (prism, pyramid, cylinder, cone) shown alongside its unfolded 2D net | 6.G.A.4, 7.G.B.6 |
| G-M15 | **Cross-Section of 3D Shape** | Plane slicing through a 3D figure showing the resulting 2D cross-section | 7.G.A.3 |

### High School Geometry (Grades 9-12)
| # | Diagram Type | Description | CCSS Alignment |
|---|---|---|---|
| G-H1 | **Point, Line, Plane Basics** | Diagram showing undefined terms with labeled points, lines, line segments, and rays | HSG.CO.A.1 |
| G-H2 | **Angle Bisector Construction** | Compass-and-straightedge construction with arcs showing bisected angle | HSG.CO.D.12 |
| G-H3 | **Perpendicular Bisector Construction** | Compass construction showing perpendicular bisector of a segment | HSG.CO.D.12 |
| G-H4 | **Triangle Congruence (SSS, SAS, ASA, AAS, HL)** | Pairs of triangles with congruent parts marked (tick marks and arcs) for each congruence postulate | HSG.CO.B.8 |
| G-H5 | **Triangle Similarity (AA, SAS, SSS)** | Pairs of similar triangles with proportional sides and equal angles marked | HSG.SRT.B |
| G-H6 | **CPCTC Proof Diagram** | Triangles with corresponding parts labeled for use in two-column or flow proofs | HSG.CO.B.7 |
| G-H7 | **Triangle Centers Diagram** | Diagrams showing centroid, circumcenter, incenter, and orthocenter with their constructions | HSG.CO.D |
| G-H8 | **Midsegment Theorem** | Triangle with segment connecting midpoints of two sides, parallel to and half the length of the third side | HSG.CO.C.10 |
| G-H9 | **Isosceles Triangle Properties** | Triangle with two equal sides, base angles marked equal, and altitude/median/angle bisector coinciding | HSG.CO.C.10 |
| G-H10 | **Quadrilateral Properties Diagram** | Parallelogram, rectangle, rhombus, square, trapezoid, and kite with their defining properties marked | HSG.CO.C.11 |
| G-H11 | **Circle Parts Diagram** | Circle with labeled radius, diameter, chord, secant, tangent, arc (major/minor), central angle, and inscribed angle | HSG.C.A |
| G-H12 | **Inscribed Angle Theorem** | Circle showing inscribed angle = half the central angle subtending the same arc | HSG.C.A.2 |
| G-H13 | **Tangent-Radius Perpendicularity** | Circle with tangent line and radius to point of tangency forming 90-degree angle | HSG.C.A.2 |
| G-H14 | **Chord-Chord, Secant-Secant, Secant-Tangent** | Diagrams for each intersection case with angle and segment length relationships | HSG.C.A.2-3 |
| G-H15 | **Arc Length and Sector Area** | Circle with shaded sector showing relationship between central angle, arc length, and sector area | HSG.C.B.5 |
| G-H16 | **Equation of a Circle on Coordinate Plane** | Circle centered at (h,k) with radius r plotted on coordinate axes with equation (x-h)^2 + (y-k)^2 = r^2 | HSG.GPE.A.1 |
| G-H17 | **Coordinate Geometry Proof Diagram** | Shapes plotted on coordinate plane with vertices at specific coordinates for algebraic proofs | HSG.GPE.B.4-7 |
| G-H18 | **Trigonometric Ratios in Right Triangle** | Right triangle with opposite, adjacent, hypotenuse labeled relative to an angle; SOH-CAH-TOA | HSG.SRT.C.6-8 |
| G-H19 | **Unit Circle with Trigonometric Values** | Circle on coordinate plane with key angles (0, 30, 45, 60, 90, etc.) and their (cos, sin) coordinates | HSF.TF.A.2 |
| G-H20 | **Law of Sines / Law of Cosines Diagram** | Non-right triangle with all sides and angles labeled for applying these laws | HSG.SRT.D.10-11 |
| G-H21 | **Geometric Transformations Composition** | Sequence of transformations (glide reflection, rotation then dilation) shown step by step | HSG.CO.A.5 |
| G-H22 | **Tessellation / Tiling Pattern** | Regular and semi-regular tessellations showing how shapes fill the plane without gaps | HSG.CO.A.5 |
| G-H23 | **3D Solid Views (Orthographic)** | Front, top, and side views of a 3D object | HSG.GMD |
| G-H24 | **3D Solid Cross-Sections** | Plane cutting through prisms, pyramids, cylinders, cones, and spheres showing resulting 2D shapes | HSG.GMD.B.4 |
| G-H25 | **Cavalieri's Principle Diagram** | Two solids with equal cross-sectional areas at every height having equal volumes | HSG.GMD.A.1 |
| G-H26 | **Surface Area from Net** | Unfolded 3D shape with dimensions on each face for surface area calculation | HSG.MG.A.1 |

---

## 6. ECONOMICS (Grades 10-12)

### Microeconomics Fundamentals
| # | Diagram Type | Description | AP Micro Alignment |
|---|---|---|---|
| E-1 | **Production Possibilities Curve (PPC)** | Concave curve showing tradeoff between two goods; points inside (inefficient), on (efficient), outside (unattainable). Shifts outward with growth | AP Micro Unit 1 |
| E-2 | **Circular Flow Diagram** | Flow of money, resources, goods/services between households, firms, government, and foreign sector through product and factor markets | AP Micro Unit 1 |
| E-3 | **Supply Curve** | Upward-sloping curve showing positive relationship between price and quantity supplied | AP Micro Unit 2 |
| E-4 | **Demand Curve** | Downward-sloping curve showing inverse relationship between price and quantity demanded | AP Micro Unit 2 |
| E-5 | **Market Equilibrium (Supply & Demand)** | S and D curves intersecting at equilibrium price and quantity; showing surplus above and shortage below equilibrium | AP Micro Unit 2 |
| E-6 | **Shift in Demand** | Demand curve shifting left (decrease) or right (increase) due to determinants of demand, with new equilibrium | AP Micro Unit 2 |
| E-7 | **Shift in Supply** | Supply curve shifting left (decrease) or right (increase) due to determinants of supply, with new equilibrium | AP Micro Unit 2 |
| E-8 | **Double Shift Diagram** | Both S and D shifting simultaneously; showing determinate and indeterminate changes in P and Q | AP Micro Unit 2 |
| E-9 | **Consumer and Producer Surplus** | Area between demand curve and price (CS) and between price and supply curve (PS); total surplus = CS + PS | AP Micro Unit 2 |
| E-10 | **Price Ceiling Diagram** | Horizontal line below equilibrium showing resulting shortage | AP Micro Unit 2 |
| E-11 | **Price Floor Diagram** | Horizontal line above equilibrium showing resulting surplus | AP Micro Unit 2 |
| E-12 | **Excise Tax Diagram** | Tax wedge between buyer price and seller price; showing tax revenue, deadweight loss, and tax incidence | AP Micro Unit 2 |

### Elasticity
| # | Diagram Type | Description | AP Micro Alignment |
|---|---|---|---|
| E-13 | **Price Elasticity of Demand Diagrams** | Side-by-side demand curves: perfectly elastic (horizontal), elastic, unit elastic, inelastic, perfectly inelastic (vertical) | AP Micro Unit 2 |
| E-14 | **Total Revenue Test Diagram** | Graph showing how total revenue changes along a demand curve (elastic region: TR rises as P falls; inelastic region: TR falls as P falls) | AP Micro Unit 2 |

### Production & Costs
| # | Diagram Type | Description | AP Micro Alignment |
|---|---|---|---|
| E-15 | **Marginal Product & Diminishing Returns** | Graph of total product, marginal product, and average product showing law of diminishing marginal returns | AP Micro Unit 3 |
| E-16 | **Short-Run Cost Curves** | Graph showing MC, ATC, AVC, and AFC curves with MC intersecting ATC and AVC at their minimums | AP Micro Unit 3 |
| E-17 | **Long-Run Average Total Cost (LRATC)** | U-shaped envelope curve showing economies of scale, constant returns, and diseconomies of scale | AP Micro Unit 3 |

### Market Structures
| # | Diagram Type | Description | AP Micro Alignment |
|---|---|---|---|
| E-18 | **Perfect Competition (Short-Run)** | Individual firm as price taker: horizontal D=MR=AR line with MC, ATC; profit/loss rectangle | AP Micro Unit 4 |
| E-19 | **Perfect Competition (Long-Run)** | Firm producing at P = MC = min ATC (zero economic profit); long-run equilibrium | AP Micro Unit 4 |
| E-20 | **Monopoly Graph** | Downward-sloping D with MR below D; profit-maximizing at MR=MC with price on demand curve; deadweight loss triangle | AP Micro Unit 4 |
| E-21 | **Natural Monopoly / Regulated Monopoly** | ATC declining throughout relevant range; showing fair-return (P=ATC) and socially optimal (P=MC) pricing | AP Micro Unit 4 |
| E-22 | **Monopolistic Competition (Short-Run & Long-Run)** | Short-run: like monopoly with profit. Long-run: D tangent to ATC (zero economic profit) with excess capacity | AP Micro Unit 5 |
| E-23 | **Oligopoly: Kinked Demand Curve** | Demand curve with kink at current price showing elastic demand above and inelastic below; discontinuous MR | AP Micro Unit 5 |
| E-24 | **Oligopoly: Game Theory Payoff Matrix** | 2x2 matrix showing payoffs for two firms' strategies (e.g., prisoner's dilemma) | AP Micro Unit 5 |

### Factor Markets
| # | Diagram Type | Description | AP Micro Alignment |
|---|---|---|---|
| E-25 | **Labor Market (Supply & Demand for Labor)** | Wage on Y-axis, quantity of labor on X-axis; equilibrium wage determined by S and D for labor | AP Micro Unit 5 |
| E-26 | **Marginal Revenue Product (MRP) Diagram** | Firm's demand for labor based on MRP = MR x MP; profit-maximizing hiring at MRP = wage | AP Micro Unit 5 |
| E-27 | **Monopsony Labor Market** | Single buyer of labor: MFC above supply; hiring where MFC = MRP at below-competitive wage | AP Micro Unit 5 |
| E-28 | **Lorenz Curve** | Cumulative income share vs. cumulative population share; bowing away from 45-degree line of equality; Gini coefficient as ratio of areas | AP Micro Unit 5 |

### Macroeconomics
| # | Diagram Type | Description | AP Macro Alignment |
|---|---|---|---|
| E-29 | **Aggregate Demand / Aggregate Supply (AD/AS)** | AD (downward-sloping), SRAS (upward-sloping), and LRAS (vertical at full-employment output); showing inflationary and recessionary gaps | AP Macro Unit 3 |
| E-30 | **AD Shift (Fiscal/Monetary Policy)** | AD shifting right (expansionary) or left (contractionary) with resulting changes in price level and real GDP | AP Macro Unit 3 |
| E-31 | **SRAS Shift (Supply Shock)** | SRAS shifting left (negative shock: stagflation) or right (positive shock: growth with lower prices) | AP Macro Unit 3 |
| E-32 | **Long-Run Self-Correction** | SRAS shifting to restore long-run equilibrium after a demand shock | AP Macro Unit 3 |
| E-33 | **Money Market Diagram** | Money supply (vertical) and money demand (downward-sloping) determining nominal interest rate | AP Macro Unit 4 |
| E-34 | **Loanable Funds Market** | Supply (savings) and demand (investment) for loanable funds determining real interest rate | AP Macro Unit 4 |
| E-35 | **Foreign Exchange Market** | Supply and demand for a currency determining exchange rate | AP Macro Unit 6 |
| E-36 | **Phillips Curve (Short-Run)** | Downward-sloping curve showing inverse short-run relationship between inflation and unemployment | AP Macro Unit 5 |
| E-37 | **Phillips Curve (Long-Run)** | Vertical line at natural rate of unemployment; SRPC shifts with inflation expectations and supply shocks | AP Macro Unit 5 |
| E-38 | **Business Cycle Diagram** | Wave showing expansion, peak, contraction (recession), and trough over time | AP Macro Unit 2 |
| E-39 | **GDP Components (Expenditure Approach)** | Stacked bar or pie chart showing C + I + G + (X-M) | AP Macro Unit 2 |
| E-40 | **Fiscal Policy Multiplier Diagram** | Showing how initial spending change multiplies through the economy (spending multiplier = 1/(1-MPC)) | AP Macro Unit 3 |
| E-41 | **Crowding Out Effect** | Loanable funds market showing how government borrowing raises interest rates and reduces private investment | AP Macro Unit 3 |
| E-42 | **Quantity Theory of Money Diagram** | Visual representation of MV = PY and its implications for inflation | AP Macro Unit 4 |

### International Trade
| # | Diagram Type | Description | AP Macro/Micro Alignment |
|---|---|---|---|
| E-43 | **Comparative Advantage Table** | Two-country, two-good table showing opportunity costs and determining which country should specialize in what | AP Macro Unit 6 |
| E-44 | **Terms of Trade Diagram** | PPC-based diagram showing how both countries benefit from trade within the range of opportunity costs | AP Macro Unit 6 |
| E-45 | **Tariff / Quota Diagram** | Supply-demand diagram for imported good showing world price, domestic price with tariff, deadweight loss, and quota effects | AP Macro Unit 6 |

---

## Summary Statistics

| Subject | Elementary (1-5) | Middle (6-8) | High School (9-12) | Total |
|---|---|---|---|---|
| **Math** | 23 | 26 | 32 | **81** |
| **Physics** | -- | -- | 48 | **48** |
| **Chemistry** | -- | -- | 51 | **51** |
| **Biology** | -- | -- | 59 | **59** |
| **Geometry** | -- | 15 | 26 | **41** |
| **Economics** | -- | -- | 45 | **45** |
| **TOTAL** | **23** | **41** | **261** | **325** |

---

## Priority Tiers for Implementation

### Tier 1: Critical (Most frequently needed in homework checking)
These diagrams appear most often in student homework and standardized tests:

**Math:** Number Line, Fraction Models, Coordinate Plane, Linear/Quadratic Graphs, Bar Models, Area Models
**Physics:** Free Body Diagram, Kinematics Graphs (x-t, v-t, a-t), Projectile Motion, Circuit Diagrams
**Chemistry:** Lewis Structures, Phase Diagram, Titration Curve, Energy Profile, Molecular Geometry (VSEPR)
**Biology:** Cell Diagrams, Punnett Squares, Mitosis/Meiosis, Photosynthesis/Respiration, DNA Structure
**Geometry:** Triangle Congruence/Similarity, Circle Theorems, Transformations, Pythagorean Theorem
**Economics:** Supply & Demand, AD/AS, Market Structures (Monopoly, Perfect Competition), PPC

### Tier 2: Important (Common in advanced courses)
**Math:** Trigonometric Graphs, Unit Circle, Conic Sections, Normal Distribution, Limit/Derivative Visualizations
**Physics:** Energy Diagrams, Wave Diagrams, Optics Ray Diagrams, Electric/Magnetic Field Lines
**Chemistry:** Electron Configuration, PES, Electrochemistry Cells, Reaction Mechanisms
**Biology:** Food Webs, Phylogenetic Trees, Body Systems, Gel Electrophoresis
**Geometry:** 3D Shapes/Cross-Sections, Coordinate Geometry Proofs, Constructions
**Economics:** Phillips Curve, Lorenz Curve, Factor Markets, International Trade

### Tier 3: Specialized (AP-level and niche topics)
**Math:** Complex Plane, Parametric Curves, Polar Graphs, Solid of Revolution
**Physics:** PV Diagrams, Bernoulli, Photoelectric Effect, Nuclear Decay
**Chemistry:** Born-Haber Cycle, Maxwell-Boltzmann, Organic Structures
**Biology:** Hardy-Weinberg, Operon Models, Geologic Time Scale
**Geometry:** Cavalieri's Principle, Tessellations, Orthographic Views
**Economics:** Game Theory Matrices, Monopsony, Crowding Out

---

## Curriculum Source References

- [Common Core State Standards for Mathematics](https://learning.ccsso.org/wp-content/uploads/2022/11/ADA-Compliant-Math-Standards.pdf)
- [NGSS High School Physical Sciences](https://www.nextgenscience.org/sites/default/files/HSTopic.pdf)
- [AP Chemistry Course - College Board](https://apcentral.collegeboard.org/courses/ap-chemistry)
- [AP Physics 1 and 2 - College Board](https://apcentral.collegeboard.org/courses/ap-physics-1)
- [AP Biology - College Board](https://apcentral.collegeboard.org/courses/ap-biology)
- [AP Microeconomics - College Board](https://apcentral.collegeboard.org/courses/ap-microeconomics)
- [AP Macroeconomics - College Board](https://apcentral.collegeboard.org/courses/ap-macroeconomics)
- [Illustrative Mathematics K-12](https://illustrativemathematics.org/math-curriculum/)
- [ReviewEcon.com - 18 Key Microeconomics Graphs](https://www.reviewecon.com/microeconomics-graphs)
- [ReviewEcon.com - 8 Key Macroeconomics Graphs](https://www.reviewecon.com/macroeconomics-graphs)
- [Fiveable AP Study Guides](https://fiveable.me/)
- [High School Geometry CCSS](https://www.thecorestandards.org/Math/Content/HSG/)
- [Visual Representations on HS Science Assessments (Springer)](https://link.springer.com/article/10.1007/s10956-015-9566-4)
- [Room to Discover - Visual Models Guide](https://roomtodiscover.com/visual-models/)
- [Physics Classroom - Free Body Diagrams](https://www.physicsclassroom.com/class/newtlaws/Lesson-2/Drawing-Free-Body-Diagrams)
- [Chemistry LibreTexts - Lewis Structures](https://chem.libretexts.org/Courses/Oregon_Institute_of_Technology/OIT:_CHE_202_-_General_Chemistry_II/Unit_4:_Lewis_Structures/4.2:_Lewis_Structures)
