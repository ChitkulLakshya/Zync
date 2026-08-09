// Ambient declarations for yjs ecosystem packages without bundled types.
// Required so `npx tsc --noEmit` passes while preserving existing runtime imports.
declare module 'y-indexeddb';
declare module 'y-protocols/awareness';
