// Imports the createRoot function from the react-dom/client library to initialize the React application tree in modern React 18+ style.
import { createRoot } from "react-dom/client";
// Imports the primary App component which serves as the root container for all routes and global state providers in the application.
import App from "./App";
// Imports the global CSS file to apply base styles, utility classes, and custom variables across the entire application before any components render.
import "./index.css";
// Imports the registerSW function from the virtual PWA plugin to enable service worker registration for offline support and caching.
import { registerSW } from "virtual:pwa-register";

// Executes the service worker registration immediately on load, ensuring caching and background features are initialized as early as possible without waiting for user interaction.
registerSW({ immediate: true });

// Locates the HTML element with the ID of 'root', asserts it is non-null with the '!' operator, and renders the imported App component into this DOM node to start the application.
createRoot(document.getElementById("root")!).render(<App />);
