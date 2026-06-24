import Dexie, { type Table } from 'dexie';

export interface UserData {
  id: string; // usually maps to userId / uid
  email?: string;
  [key: string]: any;
}

export interface ProjectData {
  id: string;
  userId: string;
  [key: string]: any;
}

export class ZyncAppDB extends Dexie {
  userData!: Table<UserData, string>;
  projectData!: Table<ProjectData, string>;

  constructor() {
    super('zyncAppDB');
    this.version(1).stores({
      userData: 'id, updatedAt',
      projectData: 'id, userId, updatedAt',
    });
  }
}

export const db = new ZyncAppDB();
