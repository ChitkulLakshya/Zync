// Imports the core Dexie class and the Table type interface from the Dexie.js library, which provides a robust wrapper around IndexedDB for local browser storage.
import Dexie, { type Table } from "dexie";

// Exports a TypeScript interface defining the shape of a user's data object when stored locally in IndexedDB.
export interface UserData {
  // Specifies that every UserData record must have a unique string identifier.
  id: string;
  // Specifies an optional email string property.
  email?: string;
  // Allows any other dynamic key-value pairs to be stored on the user object without strict typing.
  [key: string]: any;
}

// Exports a TypeScript interface defining the shape of a project data object when cached locally.
export interface ProjectData {
  // Specifies that every ProjectData record must have a unique string identifier.
  id: string;
  // Specifies that every ProjectData record must be associated with a user's ID for query filtering.
  userId: string;
  // Allows any other dynamic project-related properties to be stored alongside the required fields.
  [key: string]: any;
}

// Defines a custom database class that extends the base Dexie class to construct the specific IndexedDB schema for the Zync application.
export class ZyncAppDB extends Dexie {
  // Declares a strictly typed Dexie Table property for storing UserData records, using a string as the primary key type.
  userData!: Table<UserData, string>;
  // Declares a strictly typed Dexie Table property for storing ProjectData records, using a string as the primary key type.
  projectData!: Table<ProjectData, string>;

  // Defines the class constructor which is invoked when a new instance of the database is created.
  constructor() {
    // Calls the parent Dexie class constructor, passing 'zyncAppDB' as the internal name for the IndexedDB database instance.
    super("zyncAppDB");
    // Defines the database schema for version 1, specifying the primary keys and indexed fields (like 'updatedAt') for each table to allow fast querying.
    this.version(1).stores({
      userData: "id, updatedAt",
      projectData: "id, userId, updatedAt",
    });
  }
}

// Exports a single instantiated, ready-to-use singleton instance of the ZyncAppDB database for the rest of the application to import and query.
export const db = new ZyncAppDB();
