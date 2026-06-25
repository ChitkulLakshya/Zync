import { signOut, type Auth } from "firebase/auth";
import { queryClient } from "@/lib/query-client";
import { clearQueryCache } from "@/lib/query-persister";

/** Clears TanStack Query memory + persisted localStorage cache, then signs out. */
export async function signOutAndClearState(auth: Auth): Promise<void> {
  queryClient.clear();
  clearQueryCache();
  await signOut(auth);
}
