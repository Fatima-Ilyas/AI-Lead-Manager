# AI Lead Manager frontend

A responsive React workspace for agencies and sales teams, with overview, leads, follow-ups, insights, lead entry, lead details, and a workspace guide.

## Run locally

```sh
npm install
npm run dev
```

Open the address printed by Vite. The dev server binds to `127.0.0.1` by default.

```sh
npm run build
npm run lint
npm test
```

## Backend connection and preview

Development requests use `/api`, proxied to `http://127.0.0.1:8000`. To use another backend, copy `.env.example` to `.env.local`, change `API_PROXY_TARGET`, and restart Vite. For a separately hosted production frontend, configure `VITE_API_BASE_URL` or have your host reverse-proxy `/api` to FastAPI. Vite's development proxy is not part of the production build. An absolute URL requires the backend to permit your frontend origin.

The existing backend requires `DATABASE_URL` and `GEMINI_API_KEY`. These are server secrets and must never use a `VITE_` prefix or be included in frontend code.

If the backend cannot be reached during initial loading, a clearly labeled sample workspace appears. Its records are fictional, use reserved `.example` email domains, and are kept in this browser's local storage. New preview leads receive an explicitly illustrative estimate and reply. They are never sent to the API. Use **Connect live data** to retry the configured backend; successful connection switches to the real records. Empty live databases remain empty rather than being filled with samples. Browser reloads retain preview changes and incomplete lead-entry drafts.

## Reusable architecture

- `src/components/ui.jsx`: shared buttons, Base UI selects and tooltips, avatars, badges, scores, empty states, and skeletons.
- `src/components/AppShell.jsx`: collapsible desktop navigation with a saved preference, workspace chrome, and page headings.
- `src/components/LeadTable.jsx`: compact desktop table with sortable headers, mobile summaries, search, filtering, export, and adjustable pagination.
- `src/components/Dashboard.jsx`: metrics, activity chart, stage distribution, and follow-up views.
- `src/pages/`: lead form, details, insights, and help guide.
- `src/hooks/`: API/preview data and browser-history-aware hash navigation.
- `src/lib/leads.js`: date, scoring, reporting, and safe CSV utilities.
- `src/index.css`: warm OKLCH design tokens and global foundations.
- `src/App.css`: components and responsive layouts.

Component libraries: Base UI, Lucide, Recharts, and Sonner. Manrope is locally bundled through Fontsource. Dependency versions are pinned in the lockfile.

## Accessibility and design references

Keyboard navigation, focus management, labeled controls, touch-accessible help, text status indicators, chart data alternatives, reduced motion, and responsive reflow follow the principles in [Apple's layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout), [Apple's interface design tips](https://developer.apple.com/design/tips/), and [Material's adaptive layouts](https://m3.material.io/foundations/layout/canonical-examples/overview). Tooltips use [Base UI's accessible primitives](https://base-ui.com/react/components/tooltip). This is a custom web design, not a native Apple/Google component implementation or an accessibility certification.

Use `/` to search and `N` to add a lead when not typing in a field. All functionality is also available through visible controls. On narrow screens, the navigation becomes a bottom bar and lead rows become actionable summaries. Shared product and design context lives in `../PRODUCT.md` and `../DESIGN.md`.

The second polish pass also draws on [Figma's UI design principles](https://www.figma.com/resource-library/ui-design-principles/), [Carbon's data table guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines), and [NN/g's web form guidance](https://www.nngroup.com/articles/web-form-design/). Desktop rows are 56px tall for two-line contact information, with 10, 25, or 50 records per page. New-lead entry uses grouped fieldsets in a single focused form; lead management controls move ahead of assessment and reply content on smaller screens.
