import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface TaskStats {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
    efficiency: number;
    dailyActiveAvg: number;
}

export const useTaskPersistence = (userId: string | undefined) => {
    const [stats, setStats] = useState<TaskStats | null>(null);
    const [loading, setLoading] = useState(true);
    const lastSavedFingerprintRef = useRef<string>("");
    const lastSavedAtRef = useRef<number>(0);
    const writeCooldownUntilRef = useRef<number>(0);
    const cooldownWarningShownRef = useRef<boolean>(false);
    const SAVE_DEBOUNCE_MS = 30_000;
    const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;
    const devWritesEnabled = import.meta.env.VITE_ENABLE_TASK_FIRESTORE_SYNC === "true";
    const allowFirestoreWrites = !import.meta.env.DEV || devWritesEnabled;
    const quotaCooldownKey = userId ? `zync-task-sync-cooldown:${userId}` : "";

    const normalizeStats = (input: TaskStats): TaskStats => ({
        total: Number(input?.total || 0),
        inProgress: Number(input?.inProgress || 0),
        completed: Number(input?.completed || 0),
        overdue: Number(input?.overdue || 0),
        efficiency: Number(input?.efficiency || 0),
        dailyActiveAvg: Number(input?.dailyActiveAvg || 0),
    });

    const buildFingerprint = (input: TaskStats): string => {
        const normalized = normalizeStats(input);
        return JSON.stringify(normalized);
    };

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        if (quotaCooldownKey) {
            const persistedCooldown = Number(localStorage.getItem(quotaCooldownKey) || "0");
            if (persistedCooldown > Date.now()) {
                writeCooldownUntilRef.current = persistedCooldown;
            }
        }

        const docRef = doc(db, "tasks", userId);
        
        // Listen for real-time updates
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setStats(docSnap.data() as TaskStats);
            } else {
                setStats({ total: 0, inProgress: 0, completed: 0, overdue: 0, efficiency: 0, dailyActiveAvg: 0 });
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching task stats from Firestore:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const saveStats = useCallback(async (newStats: TaskStats) => {
        if (!userId || !allowFirestoreWrites) {return;}

        const now = Date.now();
        if (writeCooldownUntilRef.current > now) {
            return;
        }

        const normalized = normalizeStats(newStats);
        const fingerprint = buildFingerprint(normalized);

        // Skip unchanged writes.
        if (fingerprint === lastSavedFingerprintRef.current) {
            return;
        }

        // Coalesce frequent writes caused by rapid UI/state updates.
        if (now - lastSavedAtRef.current < SAVE_DEBOUNCE_MS) {
            return;
        }

        try {
            await setDoc(doc(db, "tasks", userId), normalized, { merge: true });
            lastSavedFingerprintRef.current = fingerprint;
            lastSavedAtRef.current = now;
            cooldownWarningShownRef.current = false;
        } catch (error) {
            const code = (error as any)?.code || "";
            if (code === "resource-exhausted") {
                writeCooldownUntilRef.current = now + QUOTA_COOLDOWN_MS;
                if (quotaCooldownKey) {
                    localStorage.setItem(quotaCooldownKey, String(writeCooldownUntilRef.current));
                }
                if (!cooldownWarningShownRef.current) {
                    console.warn("Firestore quota reached; pausing task stat writes temporarily.");
                    cooldownWarningShownRef.current = true;
                }
                return;
            }
            console.error("Error saving task stats to Firestore:", error);
        }
    }, [userId, allowFirestoreWrites, quotaCooldownKey]);

    const markTaskOpened = async (taskId: string) => {
        if (!userId || !allowFirestoreWrites) {return;}
        // In Firestore, we should ideally track individual task statuses in a subcollection
        // but to satisfy "Overdue = user just opened the task" simply, we can increment a counter or track in a map
        try {
            const docRef = doc(db, "tasks", userId);
            const snap = await getDoc(docRef);
            const currentStats = snap.exists() ? snap.data() as TaskStats : { total: 0, inProgress: 0, completed: 0, overdue: 0 };
            
            // For now, let's just increment overdue if this is a "new" opening (simulated)
            // A better way would be tracking specific task IDs in a sub-collection
            await setDoc(docRef, { ...currentStats, overdue: (currentStats.overdue || 0) + 1 }, { merge: true });
        } catch (error) {
            console.error("Error marking task as opened:", error);
        }
    };

    return { stats, loading, saveStats, markTaskOpened };
};
