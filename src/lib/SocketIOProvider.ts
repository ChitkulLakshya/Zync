import * as Y from 'yjs';
import { io, Socket } from 'socket.io-client';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { SOCKET_BASE_URL } from '@/lib/utils';
import { Observable } from 'lib0/observable';

export class SocketIOProvider extends Observable<string> {
  doc: Y.Doc;
  socket: Socket;
  awareness: Awareness;
  connected: boolean = false;

  constructor(noteId: string, doc: Y.Doc, user: any) {
    super();
    this.doc = doc;
    this.awareness = new Awareness(doc);

    this.awareness.setLocalStateField('user', {
      name: user.name || 'Anonymous',
      color: user.color || '#3b82f6',
    });

    const socketUrl = SOCKET_BASE_URL;

    this.socket = io(`${socketUrl}/notes`, {
      transports: ['websocket', 'polling'],
      query: { userId: user.uid || 'anonymous' },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[YJS Socket] Connected to room:', noteId);
      this.connected = true;
      this.emit('status', [{ status: 'connected' }]);
      this.socket.emit('join-note', noteId);

      // Send our initial state so others receive our document
      setTimeout(() => {
        try {
          const stateUpdate = Y.encodeStateAsUpdate(this.doc);
          this.socket.emit('note-update', { noteId, update: Array.from(stateUpdate) });
        } catch (e) {
          console.error('[YJS Socket] Failed to send initial state', e);
        }

        if (this.awareness.clientID) {
          const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
          this.socket.emit('awareness-update', { noteId, update: Array.from(awarenessUpdate) });
        }
      }, 500);
    });

    this.socket.on('disconnect', () => {
      console.log('[YJS Socket] Disconnected');
      this.connected = false;
      this.emit('status', [{ status: 'disconnected' }]);
    });

    this.socket.on('user-joined-yjs', () => {
      // Someone joined! Send them our current state.
      try {
        const stateUpdate = Y.encodeStateAsUpdate(this.doc);
        this.socket.emit('note-update', { noteId, update: Array.from(stateUpdate) });
      } catch (e) {
        console.error('[YJS Socket] Failed to send state to new user', e);
      }
    });

    this.socket.on('note-update', (update: any) => {
      try {
        let uint8;
        if (update instanceof ArrayBuffer) {
          uint8 = new Uint8Array(update);
        } else if (update && update.buffer instanceof ArrayBuffer) {
          uint8 = new Uint8Array(update.buffer, update.byteOffset, update.byteLength);
        } else if (Array.isArray(update)) {
          uint8 = new Uint8Array(update);
        } else if (typeof update === 'object' && update !== null) {
          uint8 = new Uint8Array(Object.values(update));
        } else {
          uint8 = new Uint8Array(update);
        }

        Y.applyUpdate(this.doc, uint8, this);
      } catch (e) {
        console.error('[YJS Socket] Failed to apply update', e, update);
      }
    });

    this.doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== this && this.connected) {
        this.socket.emit('note-update', { noteId, update: Array.from(update) });
      }
    });

    this.socket.on('awareness-update', (update: any) => {
      try {
        let uint8;
        if (update instanceof ArrayBuffer) {
          uint8 = new Uint8Array(update);
        } else if (update && update.buffer instanceof ArrayBuffer) {
          uint8 = new Uint8Array(update.buffer, update.byteOffset, update.byteLength);
        } else if (Array.isArray(update)) {
          uint8 = new Uint8Array(update);
        } else if (typeof update === 'object' && update !== null) {
          uint8 = new Uint8Array(Object.values(update));
        } else {
          uint8 = new Uint8Array(update);
        }
        applyAwarenessUpdate(this.awareness, uint8, this);
      } catch (e) {
        console.error('[YJS Socket] Failed to apply awareness', e, update);
      }
    });

    this.awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      if (origin !== this && this.connected) {
        const changedClients = added.concat(updated).concat(removed);
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        this.socket.emit('awareness-update', { noteId, update: Array.from(update) });
      }
    });
  }

  destroy() {
    this.socket.disconnect();
    this.awareness.destroy();
  }
}
