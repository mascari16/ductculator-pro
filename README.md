# Ductwork Pro

Duct sizing and fabrication math for the shop. A static web app (no build step) that also installs to a phone or desktop and works offline.

## Tools

**Duct sizing**
- **Airflow** – size round duct by constant velocity, equal friction or single-step static regain, with rectangular and flat oval options. A **Manual wheel** mode gives a slide-rule duct sizing wheel (airflow, friction, round size, velocity, rectangular equivalents) on the same friction chart.
- **Pressure Loss** – straight-duct friction plus fitting losses (C × velocity pressure) for one section.
- **Reverse Calculator** – velocity or airflow, friction rate and velocity pressure for an existing duct.
- **Equivalent Sizes** – round, rectangular and flat oval equivalents by equal friction.

**Fabrication**
- **Elbow Offset** – two-elbow rectangular offsets with a live 3D preview; Auto CLR, elbows-only (no straight) and snap-to-standard-angle options.
- **Round Fittings** – round offsets (including rolling offsets), laterals parallel or square to the main, and gored elbow layout.
- **Rect Fittings** – mitered offsets with straight elbows (miter cut, lean, O × W ÷ L), rectangular laterals with radius or straight elbows, and field doglegs from a straight joint (wedge-and-bend or cut-and-roll), with step-by-step marks and a fold animation.
- **Transition Splitter** – split a long taper into CAMduct entries, by count or by max piece length, with a taper-angle check.

**Shop math**
- **Layout Math** – right triangles, rolling offsets, arcs and swing point radius.
- **Material Takeoff** – sheet area and galvanized weight by gauge.
- **HVAC Pro Calc** – 4090-style construction calculator (`hvac-pro-calc.html`, also works on its own).

## Everywhere
- Inputs are remembered between visits.
- **Jobs and sharing** on each screen: save named jobs, copy a share link that opens the screen with the same numbers, print a sheet, or reset to defaults.
- Measurements accept `46`, `46.25`, `46 1/4`, `46-1/4` or `3' 10 1/4`; results are to the nearest 1/16".

## Files
- `index.html` – all screens
- `style.css`, `offsetiso.css` – layout; `theme.css` – visual theme (loaded last)
- `app.js`, `offsetiso.js`, `js/*.js` – calculators and screen logic
- `sw.js`, `manifest.webmanifest`, `icons/` – offline install
