import * as Y from 'yjs';
import { io, Socket } from 'socket.io-client';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { API_BASE_URL } from '@/lib/utils';
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

    this.socket = io(`${API_BASE_URL}/notes`, {
        transports: ['websocket'], // Force websocket
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('status', [{ status: 'connected' }]);
      this.socket.emit('join-note', noteId);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.emit('status', [{ status: 'disconnected' }]);
    });

    // --- Document Sync ---
    this.socket.on('note-update', (update: any) => {
      const uint8 = new Uint8Array(update);
      Y.applyUpdate(this.doc, uint8, this);
    });

    this.doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== this) {
        this.socket.emit('note-update', { noteId, update });
      }
    });

    // --- Awareness Sync ---
    this.socket.on('awareness-update', (update: any) => {
      const uint8 = new Uint8Array(update);
      applyAwarenessUpdate(this.awareness, uint8, this);
    });

    this.awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      if (origin !== this) {
        const changedClients = added.concat(updated).concat(removed);
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        this.socket.emit('awareness-update', { noteId, update });
      }
    });
  }

  destroy() {
    this.socket.disconnect();
    this.awareness.destroy();
  }
}
