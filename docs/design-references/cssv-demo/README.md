# CSVora Visual Direction Reference

This folder contains visual references for CSVora's product direction.

These assets are NOT architecture references and are NOT a request to adopt CSSV as a file format.

CSVora continues to accept ordinary CSV files and stores presentation configuration separately from the source data.

The purpose of these references is to establish the visual quality bar and demonstrate the core product idea:

> The same raw CSV data can become radically different, intentionally designed visual experiences.

## Source Reference

Primary source:

- `reference.mp4`

Canonical extracted frames:

- `frames/raw-csv.png`
- `frames/departures-board.png`
- `frames/document.png`
- `frames/periodic-table.png`
- `frames/chat-view.png`
- `frames/remote-view.png`
- `frames/renderer-overview.png`

## Canonical Frame Timings

The canonical extraction timings from `reference.mp4` are:

| Time         | File                    | Purpose                                                          |
| ------------ | ----------------------- | ---------------------------------------------------------------- |
| `00:00:01.0` | `raw-csv.png`           | Neutral/raw CSV presentation and workspace restraint             |
| `00:00:06.5` | `departures-board.png`  | High-contrast dark renderer, status colors, typography, spacing  |
| `00:00:13.5` | `document.png`          | Editorial/document/report presentation                           |
| `00:00:21.5` | `periodic-table.png`    | Dense structured visualization, grouped cards, color hierarchy   |
| `00:00:28.5` | `chat-view.png`         | Mobile/chat-style transformation and narrow-layout presentation  |
| `00:00:33.5` | `remote-view.png`       | Highly specialized object/control-style renderer                 |
| `00:00:36.0` | `renderer-overview.png` | Overall concept: one CSV, multiple radically different renderers |

If frames need to be regenerated, prefer these timestamps rather than evenly spaced extraction.

## Reference Priority

Use the frames at different confidence levels.

### High-confidence visual references

#### `departures-board.png`

Use as the strongest reference for:

- dark presentation surfaces
- high contrast
- compact data density
- monospace/display typography
- column rhythm
- yellow accent
- semantic status colors
- panel depth
- subtle shadowing
- restrained rounded corners
- clear visual hierarchy

Do not copy labels or content literally.

#### `periodic-table.png`

> **Note**: Conceptual inspiration only. Not an implementation target unless explicitly requested in a future task.

Use as a conceptual reference for:

- dense visual information
- grouped categorical color systems
- grid rhythm
- compact cards
- dark surfaces
- strong hierarchy
- intentional use of spacing
- designing structured data beyond normal tables

#### `raw-csv.png`

Use as a strong reference for:

- neutral workspace styling
- restrained layout
- typography
- generous outer spacing
- document/window surfaces
- subtle shadows
- minimal chrome
- simple, confident presentation

### Medium-confidence references

#### `document.png`

Use primarily for:

- editorial/document layout
- typographic hierarchy
- report-style presentation
- vertical rhythm
- transforming rows into document sections

Do not infer exact typography or spacing from blurred text.

#### `chat-view.png`

Use for:

- narrow/mobile renderer concepts
- conversational presentation
- stacked row transformation
- renderer-specific layout changes

Do not treat it as a requirement for CSVora's main app shell.

#### `remote-view.png`

Use to understand that a CSV renderer may become a highly specialized interface rather than a conventional table.

This is conceptual inspiration, not a near-term implementation target.

### Concept-only frame

#### `renderer-overview.png`

Use only for the product principle:

> one source dataset can produce many entirely different visual outputs

Do not use this frame for pixel-level styling decisions.

## CSVora Visual Principles

CSVora should feel like a modern visual data design tool rather than an Excel clone.

Core principles:

- warm neutral/off-white application canvas
- subtle dotted/grid texture where appropriate
- strong black typography
- selective yellow accent
- dark high-contrast surfaces for specialized renderers
- compact but readable information density
- carefully controlled spacing
- restrained border radius
- subtle shadows rather than exaggerated glass effects
- strong visual hierarchy
- deliberate typography
- data-first presentation
- renderer-specific personality

Avoid generic dashboard aesthetics.

Avoid excessive:

- gradients
- glassmorphism
- giant rounded cards
- decorative shadows
- random accent colors
- oversized whitespace inside data surfaces

## Product Direction

CSVora must support the conceptual pipeline:

CSV Data +
Presentation Configuration +
Renderer
=

Visual Output

The CSV source remains ordinary CSV.

Presentation must remain separate from source data.

### Supported Renderers in CSVora

CSVora presently supports:

- **Table**: Standard interactive tabular view with column formatting, type overrides, reordering, visibility, and virtualization
- **Departures Board**: Specialized high-contrast airport departures display with split-flap presentation, conservative role auto-mapping, and status semantics

Future renderers under consideration may include:

- financial report
- document/report layout
- cards
- terminal-style view
- chat-style layout
- specialized visualizations

The architecture does not assume that every CSV will ultimately be displayed as an HTML table.

## Important Distinction

These references establish:

- visual quality
- transformation depth
- renderer diversity
- design direction

They do NOT establish:

- CSVora branding
- CSVora copy
- CSVora file format
- internal code architecture
- exact feature requirements

Do not copy CSSV branding, logos, marketing text, or proprietary visual identity.

CSVora must remain visually distinct while reaching a comparable level of polish and transformation.

## Instructions for Coding Agents

Before visual or renderer-related work:

1. inspect this README
2. inspect all canonical frames
3. inspect `reference.mp4` if video inspection is available
4. use high-confidence frames for exact visual decisions
5. use medium-confidence frames for layout direction only
6. use `renderer-overview.png` for concept only

When implementing domain/backend tasks, use these references only to ensure architecture does not prevent future visual renderers.

When implementing visual editor or renderer tasks, treat these references as explicit design acceptance criteria.
