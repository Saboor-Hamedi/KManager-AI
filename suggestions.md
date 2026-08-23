
**Prompt: Sidebar Cleanup & Hierarchy (Minimalist Approach)**

"The current sidebar feels cluttered and visually heavy. Please revert to a cleaner, flatter design but improve the hierarchy using only spacing and opacity. Do not add heavy borders, gradients, or complex backgrounds.

1.  **Remove Visual Noise:**
    *   Remove any heavy borders, outlines, or pill-shaped backgrounds around 'New Session' or nav items. Keep it flat and clean.
    *   Remove any complex gradient backgrounds for active states. Use a simple, subtle background tint (e.g., `bg-white/5`) instead.

2.  **Create Separation via Spacing (Not Lines):**
    *   Instead of a visible divider line, use **vertical whitespace**. Add `mt-8` (margin-top) to the 'Documentation' section to physically separate it from 'Analytics'. The empty space is the divider.
    *   Ensure consistent vertical padding (e.g., `py-3`) for all nav items so they aren't cramped.

3.  **Typography & Opacity Hierarchy:**
    *   **Active Item:** Text should be `text-white` (100% opacity) and `font-medium`. No bolding needed if the contrast is right.
    *   **Inactive Items:** Text should be `text-white/50` (50% opacity). This creates depth without adding colors.
    *   **Utility Items (Bottom):** Reduce font size slightly (e.g., `text-sm` or `13px`) and keep opacity at `text-white/40`. This naturally pushes them to the background visually.

4.  **'New Session' Button:**
    *   Keep it simple. Just ensure it has slightly more top margin (`mt-4`) to separate it from the logo.
    *   On hover, just increase opacity or add a very faint background highlight. No borders.

5.  **Shortcut Keys:**
    *   Make them smaller (`text-xs`) and more muted (`text-white/30`). They are helpers, not main content. Align them perfectly to the right.

6.  **Logo Alignment:**
    *   Ensure the logo and 'KMANAGER' text are vertically centered in their container. Add `mb-6` below the logo row to give the navigation room to start.

**Goal:** A sidebar that looks like a native, high-end desktop app (like Linear or Arc). Flat, spacious, and relying on opacity/size for hierarchy rather than decorations."