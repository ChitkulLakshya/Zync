import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/utils";

export const useTeamProtection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkTeamStatus = async (user: any) => {
            if (!user) {
                setLoading(false);
                return;
            }

            // Skip check if already on onboarding page or public pages
            const publicPaths = ['/login', '/signup', '/', '/dashboard/people'];
            if (publicPaths.includes(location.pathname)) {
                setLoading(false);
                return;
            }

            try {
                const token = await user.getIdToken();
                const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    if (!userData.teamId) {
                        navigate('/dashboard/people');
                    }
                }
            } catch (error) {
                console.error("Error checking team status:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged((user) => {
            checkTeamStatus(user);
        });

        return () => unsubscribe();
    }, [navigate, location.pathname]);

    return { loading };
};
