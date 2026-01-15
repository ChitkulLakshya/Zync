import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const API_BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFullUrl(path: string | undefined | null) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function getUserName(user: any) {
  if (!user) return "User";
  return user.displayName ||
    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
    user.name ||
    user.email?.split('@')[0] ||
    "User";
}

export function getUserInitials(user: any) {
  const name = getUserName(user);
  return name.substring(0, 2).toUpperCase();
}
