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