# UI Refactoring Standards & Design System Usage

This document outlines the standards established during the "Aviator/Obsidian" UI refactor to ensure consistency across the application.

## Core Philosophy
- **Aesthetic**: "High-end Avionics" / "Obsidian Spectrum"
- **Mood**: Dark, technical, precise, premium.
- **Avoid**: Default browser styles, generic gray backgrounds, rounded-lg (unless specified).

## Component Usage

### 1. Containers (`Card`)
Use the `Card` component for all distinct content sections.
- **Default**: `<Card variant="default" elevation={2}>` for main content areas (tables, forms).
- **Glass**: `<Card glass>` for overlays or floating elements.
- **Alert**: `<Card variant="alert">` for warning/destructive zones.
- **Metric**: `<Card variant="metric">` for single-value displays.

**Do not use**: `div className="bg-[#0a0a0a] border..."` manually.

### 2. Tables (`Table`)
Use the `@/components/ui/table` components.
- Wrap tables in a `<Card className="overflow-hidden">`.
- Header background: `bg-secondary/30`.
- Row hover: `hover:bg-white/5`.
- Typography: Use `font-mono text-xs uppercase tracking-wider text-muted-foreground` for headers.

### 3. Buttons (`Button`)
- **Primary Action**: `<Button variant="default" glow>` (e.g., "Deploy Agent", "Add Client").
- **Secondary Action**: `<Button variant="outline">`.
- **Icon Actions**: `<Button variant="ghost" size="icon-sm">` (e.g., Row actions).
- **Destructive**: `<Button variant="destructive">`.

### 4. Typography
- **Headings**: `font-display` (Inter/Sans).
- **Data/Numbers**: `font-mono` (JetBrains Mono).
- **Labels**: `text-xs uppercase tracking-wider font-medium text-muted-foreground`.

### 5. Colors (Tailwind)
- **Backgrounds**: `bg-background`, `bg-obsidian-100`, `bg-obsidian-200`.
- **Text**: `text-foreground`, `text-muted-foreground`.
- **Accents**: `text-primary` (Electric Lime), `text-gold` (Amber).
- **Status**: `text-emerald-500` (Active/Profit), `text-rose-500` (Error), `text-amber-500` (Warning).

**Forbidden**: Hardcoded Hex codes (e.g., `#050505`, `#111`). Use the semantic tokens.

## Refactor Checklist
1. Check for manual `border border-white/10`. Replace with `border-border`.
2. Check for manual `bg-[#...]`. Replace with `bg-card` or `bg-obsidian-x`.
3. Ensure all inputs are `<Input>` or custom styled with `bg-obsidian-200`.
