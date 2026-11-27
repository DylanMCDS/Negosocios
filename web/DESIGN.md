# DESIGN · Negosocios

> Locked from direction R1-v1 (`.uak/design/rounds/R1/v1`). Global changes after the lock need a human decision.

## Direction
- Name: `Mono-led` · Intent: cobrar y entender el día en una pantalla clara, con voz sencilla y números grandes.
- The one memorable element: el importe y el QR en tipo mono a escala de póster ("100 MXN", "Pagado"); todo lo demás es calmado, de línea fina.
- References: `web/public/design-lock/screens/` (the three locked screens; no outside product captures taken)

## Type
- Families: display DM Mono 500 · body Commissioner 400/600
- Scale (px, ratio ≥ 1.25, 6 steps): 14 / 18 / 24 / 32 / 48 / 72
- Body: 18 px · line height 1.5 · hero display 72 px (48 at 390) · tabular figures for numbers: yes

## Space and shape
- Spacing scale (px): `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (use 3-4 steps per screen)
- Radius family: 8 / 12 / 20 · elevation: one level (`--shadow`), hairlines `1px --hairline` (`--line` for section rules)
- Content width 1280 px · side panel 400 px

## Color (tokens in `web/src/index.css`)
| Token | Value | Job |
|---|---|---|
| `--bg` | #f8f5ff | page |
| `--surface` | #ffffff | the one container level |
| `--text` / `--text-2` | #1b1030 / #5b4f73 | body / secondary |
| `--accent` | #7e14ff | the primary action and the brand moment, nothing else |
| `--accent-ink` | #ffffff | text on the accent (6.3:1) |
| `--ok` / `--warn` / `--bad` | #d3f1df / #ffe7b0 / #ffd6da | data states only |
| `--ok-ink` / `--warn-ink` / `--bad-ink` | #0a4a29 / #5a3800 / #7a0c1c | text on each state color (≥ 4.5:1) |
Also: `--tint` #ede6ff (QR stage, neutral chip), `--sky` #47bfff (reserved accent, charts only), `--hairline`, `--line`.
Disabled: muted lilac fill `--disabled` with `--disabled-ink` text, never the accent at low opacity.

## Shell (owned by the design lock task)
- `AppShell` · `NavBar` (brand mark, pill segmented control for views, 6 entries: Cobrar, Pagar, Cierre, Negocio, Voz, Inicio) · `PageHeader` · `PageLayout`
- At 390 wide: a fixed bottom bar with icon + 14 px label, 64 px tall.
- Kit in `web/src/lib/ui/`: Button (primary/secondary/ghost, sm 44 / md 56), Surface, Chip, Stat, SectionHeader, DataBadge, all with `sm`/`md`.
- Controls large, high contrast, short Spanish texts (`docs/CONTEXTO-CoDi.md` §10.8).

## Screens: one recipe and one hero each
| Screen | Recipe (skill `product-ui` §2) | Hero |
|---|---|---|
| Cobrar | flow | el QR CoDi grande sobre fondo tint, con el importe "100 MXN" y el estado Pendiente a Pagado |
| Pagar | flow | el importe y el receptor ("Pagas a") antes del botón "Pagar 100 MXN" |
| Cierre | dashboard | utilidad estimada en 72 px, con ventas y gastos debajo y lista de cobros |
| Negocio | detail | cabecera con nombre del puesto, zona, chip de estado y el QR del punto |
| Voz | flow | el botón de dictar grande y los campos estructurados (importe, categoría, fecha) para confirmar |
| Landing | `landing-story` | el cobro real: QR que se vuelve "Pagado 100 MXN" (captura real, no una estadística) |

## AI tells we refuse
- A colored side stripe on rows or cards · a card inside a card · a grid of equal boxes
- Purple-blue gradients, glass on every surface, emoji as icons, tracked-out uppercase eyebrows over every heading
- Three equal pricing or feature cards · every label in the same weight · `demo:`, `undefined` or raw IDs on screen
- Numbers de `demo_data` sin la insignia "Datos de ejemplo" · texto de botón de más de 3 palabras · controles de menos de 44 px
