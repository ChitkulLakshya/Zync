import { useEffect } from "react";
import { auth } from "@/lib/firebase";

import { API_BASE_URL } from "@/lib/utils";

export const useUserSync = () => {
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Extract names
                const displayName = user.displayName || "";
                const parts = displayName.trim().split(" ");
                const firstName = parts[0] || "";
                const lastName = parts.slice(1).join(" ") || "";

                try {
                    await fetch(`${API_BASE_URL}/api/users/sync`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            firstName,
                            lastName,
                        }),
                    });
                } catch (error) {
                    console.error("Error syncing user data:", error);
                }
            }
        });

        return () => unsubscribe();
    }, []);
};
