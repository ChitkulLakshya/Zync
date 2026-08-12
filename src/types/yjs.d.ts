// Ambient declarations for yjs ecosystem packages without bundled types.
// Required so `npx tsc --noEmit` passes while preserving existing runtime imports.

declare module 'y-indexeddb' {
  import * as Y from 'yjs';
  export class IndexeddbPersistence {
    constructor(channelName: string, doc: Y.Doc);
    on(event: string, cb: (...args: any[]) => void): void;
    destroy(): void;
  }
}

declare module 'y-protocols/awareness' {
  import { Observable } from 'lib0/observable';

  export class Awareness extends Observable<string> {
    constructor(doc: any);
    clientID: number;
    localState: any;
    setLocalStateField(field: string, value: any): void;
    removeClient(clientID?: number): void;
    getStates(): Map<number, any>;
  }

  export function applyAwarenessUpdate(
    awareness: Awareness,
    binaryUpdate: Uint8Array | number[],
    origin?: any
  ): void;

  export function encodeAwarenessUpdate(
    awareness: Awareness,
    removedClients: number[]
  ): Uint8Array;

  export function modifyAwarenessUpdate(
    awareness: Awareness,
    binaryUpdate: Uint8Array,
    remove: boolean
  ): void;

  export function outdatedTimeout(awareness: Awareness): void;

  export function removeAwarenessStates(
    awareness: Awareness,
    clientIDs: number[]
  ): void;
}
