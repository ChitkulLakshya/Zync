// Imports the signOut method to terminate the Firebase session, and the Auth type definition for TypeScript type checking.
import { signOut, type Auth } from "firebase/auth";
// Imports the globally instantiated queryClient which holds the active runtime cache of all fetched data.
import { queryClient } from "@/lib/query-client";
// Imports the custom clearQueryCache utility function that wipes the persisted cache from local storage.
import { clearQueryCache } from "@/lib/query-persister";

/** Clears TanStack Query memory + persisted localStorage cache, then signs out. */
// Exports an asynchronous function that takes the Firebase Auth instance and coordinates the complete sign-out process, including data cleanup.
export async function signOutAndClearState(auth: Auth): Promise<void> {
  // Synchronously clears the active TanStack Query cache in memory to prevent the next user from seeing the previous user's data.
  queryClient.clear();
  // Synchronously invokes the utility function that removes the persisted cache from the browser's localStorage or IndexedDB.
  clearQueryCache();
  // Awaits the Firebase SDK's signOut method to officially terminate the authentication session on the client and server.
  await signOut(auth);
}
