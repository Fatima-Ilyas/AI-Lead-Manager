# AI Lead Manager design system

## Scene and theme

A sales team reviews leads on bright office monitors during the working day and checks follow-ups on a phone between client meetings. A light, warm workspace preserves legibility in both settings.

## Color strategy

Restrained: warm tinted neutrals, charcoal text, and coral used for primary actions and current navigation. Semantic green, amber, blue, and plum distinguish pipeline stages with text labels. CSS colors use OKLCH. Avoid pure black and white.

## Typography

Locally bundled Manrope, with native sans-serif fallbacks. Fixed rem-based product scale. Strong but modest heading contrast; readable 14px and 15px interface text; tabular numbers for counts. Prose stays below 70 characters per line.

## Layout

Persistent desktop side navigation and a compact 64px top bar. Navigation collapses to a labeled icon rail and remembers its state; the sidebar remains scrollable without a visible scrollbar. Content has a maximum width and deliberate breathing room. At intermediate widths, content columns collapse. On phones, navigation becomes a fixed bottom bar and tables become fully actionable lead summaries. Respect device safe areas.

## Components

Reusable buttons, icon buttons, badges, avatar initials, accessible Base UI selects, tooltips, help popovers, section headers, empty states, skeletons, and form fields. Recharts supplies responsive activity charts; Lucide supplies one consistent icon family; Sonner supplies action feedback.

## Workflows

Overview presents pipeline totals, real activity, follow-up priorities, and recent leads. Leads uses a compact semantic data table with 56px rows, sortable headers, aligned budgets, search, filters, CSV export, and adjustable pagination. Add lead uses a centered form grouped into contact and opportunity fieldsets, with no competing sidebar copy. Lead details separates opportunity information and reply drafting from stage and follow-up management; on narrow screens, management appears before the longer assessment and reply. Follow-ups groups overdue, today, and upcoming records. Insights derives aggregate information from the current records.

## Help

Small question-mark buttons explain lead scores, high intent, pipeline stages, response drafts, and recommendations. Help remains available on hover and keyboard focus, with tap support for touch devices. Essential form instructions remain visible.

## Polish references

The refinement pass applies hierarchy, proximity and consistency from [Figma's UI design principles](https://www.figma.com/resource-library/ui-design-principles/), compact table structure and sorting guidance from [Carbon's data table guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines), and field grouping and visible labels from [NN/g's web form guidance](https://www.nngroup.com/articles/web-form-design/). These inform a custom workspace design rather than a claim of certification or native compliance.

## Data states

Loading uses skeletons. Empty states invite a useful action. When the API is unavailable, an explicitly labeled sample workspace allows local preview without implying production connectivity or real AI analysis. Preview changes persist only in local browser storage. API calls use a configurable same-origin Vite proxy.

## Motion and accessibility

Subtle 150-200ms transitions for hover, focus, and state changes. No decorative entrances, bounce, or layout animation. Respect prefers-reduced-motion. Use 44px primary touch targets, visible keyboard focus, descriptive control labels, and text alternatives for charts.
