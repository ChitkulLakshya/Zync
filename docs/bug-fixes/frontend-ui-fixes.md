# Frontend UI Layout & Animation Fixes

## Overview
This document outlines two major frontend bug fixes related to the user interface: a rendering bug in the dialog animation specific to Chromium browsers, and a Flexbox layout overflow issue in the Workspace modal.

## 1. Chromium Dialog Animation Glitch

### The Problem
When users attempted to close the "Add Project" modal, the closing animation (shrink/fade out) appeared extremely jagged, corrupted, and visually torn. 
This is a known Chromium rendering engine glitch: when a modal combines a CSS transform animation (e.g., `animate-in zoom-in` or `animate-out zoom-out`) simultaneously with the `backdrop-blur` CSS property, the browser struggles to calculate the blur effect in real-time on moving elements.

### The Solution
To resolve this, we removed the `backdrop-blur-xl` and semi-transparent `bg-background/80` classes directly from the modal content itself, replacing it with a solid `bg-background` background color. The underlying page still retains a blurred overlay via the generic `DialogOverlay`, but the moving `<DialogContent>` box no longer requires expensive real-time blur calculations during its transform animation.

**File Changed:** `src/components/ui/dialog.tsx`
- Removed: `bg-background/80 backdrop-blur-xl`
- Added: `bg-background` on `<DialogContent>`

## 2. Tabs Flexbox Overflow (Create Project Modal)

### The Problem
In the "Add Project" modal (`Workspace.tsx`), the list of GitHub repositories was spilling outside of the dark grey modal boundaries entirely, completely ignoring the `overflow-y-auto` rules.
This issue stems from deeply nested CSS Flexbox layouts when combined with Radix UI (Shadcn UI) primitives like `<TabsContent>`. The `TabsContent` component conditionally strips or overrides `display: flex` settings when switching tabs. Because this flex chain was broken, the flex children lost their max-height constraints and defaulted to their natural content height, growing endlessly and spilling out of the screen.

### The Solution
We implemented a robust CSS absolute-positioning architecture to completely bypass the flawed flex calculation chain for the tabs.

1. We wrapped the `<TabsContent>` components inside a strict flex container: `<div className="flex-1 relative overflow-hidden mt-4 min-h-0">`. This forces the parent container to exactly fit the remaining height in the modal.
2. We applied `absolute inset-0` to the `<TabsContent>` elements themselves. This absolutely positions them to snap to the exact pixel dimensions of the new relative wrapper, completely detaching the repository list from the Flexbox calculation flow.
3. The internal list of repositories can now successfully trigger `overflow-y-auto` because its height is strictly clamped by the absolute bounds.

**File Changed:** `src/components/workspace/Workspace.tsx`
- Added relative wrapper around `TabsContent`.
- Switched `TabsContent` state modifiers to `absolute inset-0`.
