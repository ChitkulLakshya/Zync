import type { User } from 'firebase/auth';
import type { NavigateFunction } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/utils';

/** Show Welcome flow for accounts created within this window (first visit only). */
const NEW_USER_WINDOW_MS = 48 * 60 * 60 * 1000;
const FRESH_SIGNIN_MATCH_WINDOW_MS = 2 * 60 * 1000;

const welcomeDoneKey = (uid: string) => `zync_welcome_done_${uid}`;

async function fetchMeWithRetry(token: string, attempts = 5): Promise<Record<string, unknown> | null> {
    for (let i = 0; i < attempts; i++) {
        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            return (await res.json()) as Record<string, unknown>;
        }
        if (res.status === 404 && i < attempts - 1) {
            await new Promise((r) => setTimeout(r, 400 * (i + 1)));
            continue;
        }
        return null;
    }
    return null;
}

function isFreshFirebaseAccount(user: User): boolean {
    const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : NaN;
    const lastSignIn = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : NaN;

    if (Number.isNaN(createdAt)) {return false;}
    if (Number.isNaN(lastSignIn)) {
        return Date.now() - createdAt < NEW_USER_WINDOW_MS;
    }

    return Math.abs(lastSignIn - createdAt) <= FRESH_SIGNIN_MATCH_WINDOW_MS;
}

/**
 * After Firebase auth succeeds, send users to `/welcome` (new accounts) or `/dashboard`.
 * Retries `/me` briefly so Mongo upsert from `useUserSync` can finish.
 */
export async function postLoginRedirect(navigate: NavigateFunction, user: User): Promise<void> {
    const done = typeof localStorage !== 'undefined' && localStorage.getItem(welcomeDoneKey(user.uid));
    let isFreshAccount = isFreshFirebaseAccount(user);

    try {
        const token = await user.getIdToken();
        const me = await fetchMeWithRetry(token);
        if (me?.createdAt) {
            const created = new Date(String(me.createdAt)).getTime();
            if (!Number.isNaN(created)) {
                isFreshAccount = Date.now() - created < NEW_USER_WINDOW_MS;
            }
        }
    } catch {
        // Keep Firebase-based fallback for fresh accounts when `/me` is unavailable.
    }

    if (isFreshAccount && !done) {
        navigate('/welcome', { replace: true });
    } else {
        navigate('/dashboard', { replace: true });
    }
}

export function markWelcomeComplete(uid: string): void {
    try {
        localStorage.setItem(welcomeDoneKey(uid), '1');
    } catch {
        /* ignore */
    }
}
