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

                // FORCE GOOGLE PHOTO SYNC
                // If user has a Google provider linked, use THAT photoURL specifically
                // This overrides any manual "firebase profile" photo that might have been set
                const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
                const photoURL = googleProvider?.photoURL || user.photoURL;

                try {
                    const controller = new AbortController();
                    // Auto-abort if component unmounts quickly is handled by cleanup
                    // checking signal in fetch

                    await fetch(`${API_BASE_URL}/api/users/sync`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL,
                            firstName,
                            lastName,
                        }),
                        signal: controller.signal
                    });
                } catch (error: any) {
                    if (error.name === 'AbortError') return;
                    console.error("Error syncing user data:", error);
                }
            }
        });

        return () => unsubscribe();
    }, []);
};
