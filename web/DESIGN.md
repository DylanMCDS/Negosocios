# DESIGN · Negosocios

> v2. Locked from direction R1-v1 (`.uak/design/rounds/R1/v1`), chosen by Dylan from captures on 2026-11-27. Replaces v1 "Mono-led". Global changes after the lock need a human decision.

## Direction
- Name: `Puesto de tianguis` · Intent: cobrar y entender el día desde el celular, con un tono amable y familiar: tarjetas blancas con sombra suave, montos grandes y legibles, verde cuando el dinero llegó.
- The one memorable element: el toldo de tianguis (franjas lila y morado con festón) y la palabra "Pagado" en verde a escala de póster; todo lo demás es calmado.
- References: `web/public/design-lock/screens/` (Inicio, Cobrar, Cobrar pagado, Cierre, Pagar a 390 y 1280) y las tres direcciones comparadas en `.uak/design/rounds/R1`. No se tomaron capturas de productos de terceros; "familiar" viene del diagnóstico de v1 (apps de pago y banca que ya usan los comerciantes), sin copiar logos ni colores de ninguna marca.

## Type
- Families: display Fredoka 600 (títulos y montos) · body Mukta 400/600. Cifras tabulares en todo el texto y en los montos; sin tipografía monoespaciada.
- Scale (px, ratio ≥ 1.25, 6 steps): 16 / 18 / 24 / 32 / 44 / 64
- Body: 18 px · line height 1.5 · hero display 64 px (44 at 390) · tabular figures for numbers: yes
- Texto mínimo 16 px. Única excepción: las etiquetas de la barra inferior (ícono + texto, 14 px).

## Space and shape
- Spacing scale (px): `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (use 3-4 steps per screen)
- Radius family: 10 / 14 / 24 and full (botones y chips son píldoras) · elevation: one level (`--shadow`; `--shadow-bar` sólo en la barra inferior), hairlines `1px --hairline`
- Sin bordes negros: los controles usan `--line` (#8d80ab, ≥ 3:1) a 1 px; las tarjetas no llevan borde.
- Content width 1280 px · side panel 400 px

## Color (tokens in `web/src/index.css`)
| Token | Value | Job |
|---|---|---|
| `--bg` | #f8f5ff | page |
| `--surface` | #ffffff | the one container level (cards, phone frame) |
| `--text` / `--text-2` | #1b1030 / #5b4f73 | body / secondary |
| `--accent` | #7e14ff | the primary action, the active nav item and the awning; nothing else |
| `--accent-ink` | #ffffff | text on the accent (6.3:1) |
| `--money` | #0b7a47 | dinero que llegó: "Pagado", importes cobrados (5.6:1 on white) |
| `--ok` / `--warn` / `--bad` | #d9f2e3 / #ffe7b0 / #ffd6da | data states only |
| `--ok-ink` / `--warn-ink` / `--bad-ink` | #0a5a33 / #5a3800 / #7a0c1c | text on each state color (≥ 4.5:1) |
Also: `--tint` #ede6ff (QR stage, neutral chip, active nav cell, secondary button), `--sky` #47bfff (reserved accent, charts only), `--hairline` #d9cff0 (rules), `--line` #8d80ab (control borders).
Disabled: muted lilac fill `--disabled` with `--disabled-ink` text, never the accent at low opacity.

## Shell (owned by the design lock task)
- `AppShell` · `NavBar`/`MenuBar` (brand mark, pill segmented control from 768 px) · `PageHeader` · `PageLayout`
- At 390 wide: a fixed bottom bar, 64 px tall, icon + 14 px label, soft shadow; the active entry is accent text on a `--tint` cell. Más de 6 entradas se desplazan en horizontal (revisar en la auditoría de UX).
- Kit in `web/src/lib/ui/`: Button (primary/secondary/ghost píldora, sm 44 / md 56), Surface (blanca, sin borde, sombra suave), Chip, Stat, SectionHeader, DataBadge, all with `sm`/`md`. Campos de texto: 56 px, borde `--line`, radio 14.
- Locked reference screens in `web/src/lib/ui/locked/` (Inicio, Cobrar, Pagar, Cierre) and captures in `web/public/design-lock/screens/`.
- Controls large, high contrast, short Spanish texts (`docs/CONTEXTO-CoDi.md` §10.8). Tap targets ≥ 44 px, one primary action per screen, in the lower half on mobile.

## Screens: one recipe and one hero each
| Screen | Recipe (skill `product-ui` §2) | Hero |
|---|---|---|
| Inicio | `landing-story` | "Pagado al momento" con la pantalla real de Cobrar en un marco de celular, bajo el toldo |
| Cobrar | flow | el QR CoDi grande sobre fondo tint, con el importe "100 MXN" y el estado Pendiente a Pagado (verde) |
| Pagar | flow | el importe y el receptor ("Pagas a") antes del botón "Pagar 100 MXN" |
| Cierre | dashboard | utilidad estimada en 44 px (64 en escritorio), con ventas y gastos debajo y lista de cobros |
| Negocio | detail | cabecera con nombre del puesto, zona, chip de estado y el QR del punto |
| Voz | flow | los campos detectados (importe grande) para confirmar |
| Explorar | map + list | la lista de negocios cercanos con distancia; el mapa acompaña |
| Aliados | flow | el código de referido y el descuento que se aplica |
| Dividir | flow | el QR de la siguiente parte a pagar y quién falta |

## AI tells we refuse
- A colored side stripe on rows or cards · a card inside a card · a grid of equal boxes
- Purple-blue gradients, glass on every surface, emoji as icons, tracked-out uppercase eyebrows over every heading
- Three equal pricing or feature cards · every label in the same weight · `demo:`, `undefined` or raw IDs on screen
- Numbers de `demo_data` sin la insignia "Datos de ejemplo" · texto de botón de más de 3 palabras · controles de menos de 44 px
- Montos o títulos en tipografía monoespaciada · bordes negros o de más de 1 px en controles y tarjetas · todo morado sobre lila sin jerarquía · "Pagado" en cualquier color que no sea el verde de dinero
