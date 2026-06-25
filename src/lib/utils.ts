import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const API_BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "");
export const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFullUrl(path: string | undefined | null) {
  if (!path) {return '';}
  if (path.startsWith('http') || path.startsWith('blob:')) {return path;}
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Prefer backend user when it has a real uid; otherwise use Firebase user.
 * Avoids treating `{}` or stale cache as valid (which made the UI show "User").
 */
export function pickUserForDisplay(userData: any, firebaseUser: any | null | undefined) {
  if (userData && typeof userData === "object" && userData.uid) {
    return userData;
  }
  return firebaseUser ?? null;
}

export function getUserName(user: any) {
  if (!user) {return "User";}
  return user.displayName ||
    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
    user.name ||
    user.email?.split('@')[0] ||
    "User";
}

export function getUserInitials(user: any) {
  const name = getUserName(user);
  if (name === "User" && user?.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
