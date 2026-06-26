import { useEffect } from "react"; // Imports the 'useEffect' hook from the 'react' library, which is used to handle side effects in functional components, such as setting up subscriptions or making API calls.
import { useNavigate, useLocation } from "react-router-dom"; // Imports the 'useNavigate' and 'useLocation' hooks from the 'react-router-dom' library, which are used for client-side routing, allowing the application to navigate between different routes and access the current location.
import { useMe } from "@/hooks/useMe"; // Imports the 'useMe' hook from a custom hook file, which is likely used to fetch and manage user data, such as the user's ID, team ID, and other relevant information.

export const useTeamProtection = () => { // Defines a custom hook named 'useTeamProtection', which is used to protect team-related routes by checking if the user has a team ID and redirecting them if necessary.
    const navigate = useNavigate(); // Initializes the 'navigate' function using the 'useNavigate' hook, which allows the application to programmatically navigate to different routes.
    const location = useLocation(); // Initializes the 'location' object using the 'useLocation' hook, which provides information about the current URL, such as the pathname.
    const { data: userData, isLoading } = useMe(); // Calls the 'useMe' hook and destructures the result into 'userData' and 'isLoading' variables, where 'userData' contains the user's data and 'isLoading' indicates whether the data is still being fetched.

    useEffect(() => { // Uses the 'useEffect' hook to define a side effect that runs when the component mounts or updates, which is used to check if the user has a team ID and redirect them if necessary.
        if (isLoading) {return;} // Checks if the user data is still being fetched, and if so, returns immediately to prevent any further execution, as the user data is not yet available.
        // Defines an array of public paths that do not require team protection, such as the login, signup, and dashboard pages.
        const publicPaths = ['/login', '/signup', '/', '/dashboard/people']; // 
        if (publicPaths.includes(location.pathname)) { // Checks if the current pathname is included in the array of public paths, and if so, returns immediately to prevent any further execution.
            return;
        }

        if (userData?.uid && !userData.teamId) { // Checks if the user has a user ID but no team ID, indicating that they need to be redirected to the dashboard people page to join a team.
            navigate('/dashboard/people'); // Calls the 'navigate' function to redirect the user to the dashboard people page, which allows them to join a team.
        }
    }, [userData, isLoading, location.pathname, navigate]); // Specifies the dependencies for the 'useEffect' hook, which includes the 'userData', 'isLoading', 'location.pathname', and 'navigate' variables, to ensure that the effect is re-run whenever any of these dependencies change.

    return { loading: isLoading }; // Returns an object with a single property 'loading' set to the 'isLoading' variable, which indicates whether the user data is still being fetched.
};