import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  // What: Hook to retrieve the current URL location object from React Router.
  // Why: We need to know which path the user attempted to access to log the error accurately.
  const location = useLocation();

  // What: Effect that runs every time the location path changes.
  // Why: Logs a console error specifying the non-existent route the user tried to reach, useful for debugging or tracking dead links.
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    // What: Flex container centering its content both vertically and horizontally.
    // Why: Presents the 404 message prominently in the middle of the screen.
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        {/* What: Large bold text displaying the 404 status code.
            Why: Immediately communicates to the user that this is an error page. */}
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        {/* What: A simple HTML link back to the root directory.
            Why: Gives the user a quick escape hatch to return to the main application instead of leaving them stranded. */}
        <a href="/" className="text-foreground underline hover:text-foreground/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
