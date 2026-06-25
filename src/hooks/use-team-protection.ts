import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMe } from "@/hooks/useMe";

export const useTeamProtection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { data: userData, isLoading } = useMe();

    useEffect(() => {
        if (isLoading) {return;}

        const publicPaths = ['/login', '/signup', '/', '/dashboard/people'];
        if (publicPaths.includes(location.pathname)) {
            return;
        }

        if (userData?.uid && !userData.teamId) {
            navigate('/dashboard/people');
        }
    }, [userData, isLoading, location.pathname, navigate]);

    return { loading: isLoading };
};
