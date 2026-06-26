// Imports core React hooks (useEffect, useMemo, useState) required for managing side effects, memoizing derived state, and tracking local component state within the custom hook.
import { useEffect, useMemo, useState } from "react";

// Declares global TypeScript interfaces to extend the standard Window/Navigator objects, informing the TypeScript compiler about custom vendor properties.
declare global {
  // Extends the standard Navigator interface specifically for this module.
  interface Navigator {
    // Adds an optional 'standalone' boolean property to the Navigator interface, which is a non-standard property used by iOS Safari to indicate if the web app is running in standalone (PWA) mode.
    standalone?: boolean;
  }
}

// Defines a constant regular expression to detect various mobile operating systems and browsers by analyzing the user agent string.
const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;

// Exports a TypeScript interface defining the exact shape of the object returned by the useAppInstallStatus hook, ensuring type safety for consumers.
export interface AppInstallStatus {
  // Boolean flag indicating if the current device is classified as a mobile device.
  isMobileDevice: boolean;
  // Boolean flag indicating if the current device is running iOS (or iPadOS).
  isIOS: boolean;
  // Boolean flag indicating if the current device is running Android.
  isAndroid: boolean;
  // Boolean flag indicating if the web application is currently running as a standalone installed app (PWA) rather than in a standard browser tab.
  isStandalone: boolean;
  // Boolean flag that combines device type and standalone status to determine if the user must be forced to install the app (e.g., blocking access until installed).
  requiresInstallWall: boolean;
  // Boolean flag indicating whether the initial client-side check for standalone status has completed, preventing premature rendering flashes before the environment is fully assessed.
  hasCheckedStatus: boolean;
}

// Exports the custom React hook function 'useAppInstallStatus' which evaluates the execution environment and returns an object of type 'AppInstallStatus'.
export const useAppInstallStatus = (): AppInstallStatus => {
  // Initializes a boolean state variable 'isStandalone' to false, tracking whether the app is currently running in PWA standalone mode.
  const [isStandalone, setIsStandalone] = useState(false);
  // Initializes a boolean state variable 'hasCheckedStatus' to false, tracking if the browser environment has been successfully queried for standalone properties yet.
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  // Retrieves the user agent string from the browser's navigator object, falling back to an empty string to prevent null errors in server-side rendering or non-standard environments.
  const userAgent = navigator.userAgent || "";
  // Calculates a boolean by checking if the user agent contains "Macintosh" AND the device supports multiple touch points (specifically to correctly identify modern iPads that spoof macOS user agents).
  const isiPadOSDesktopUA = /Macintosh/i.test(userAgent) && (navigator.maxTouchPoints || 0) > 1;
  // Determines if the device is mobile by checking the user agent against the mobile regex OR if it matches the iPad desktop spoofing detection.
  const isMobileDevice = MOBILE_UA_REGEX.test(userAgent) || isiPadOSDesktopUA;
  // Determines if the device is running iOS by checking for common Apple device strings in the user agent OR matching the iPad desktop spoof.
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) || isiPadOSDesktopUA;
  // Determines if the device is running Android by checking for the "Android" string within the user agent.
  const isAndroid = /Android/i.test(userAgent);

  // Uses the useEffect hook to execute client-side environment checks only after the component mounts, ensuring window and navigator objects are available.
  useEffect(() => {
    // Queries the browser's media features to check if the 'display-mode' is currently 'standalone' (standard PWA detection).
    const standaloneByDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
    // Checks the non-standard 'window.navigator.standalone' property specifically used by older or specific iOS Safari versions to detect PWA mode.
    const standaloneByIOS = Boolean(window.navigator.standalone);

    // Updates the 'isStandalone' state to true if either the standard media query OR the iOS-specific property indicates standalone mode.
    setIsStandalone(standaloneByDisplayMode || standaloneByIOS);
    // Updates the 'hasCheckedStatus' state to true, signaling that the initial environment assessment is complete and dependent UI logic can safely proceed.
    setHasCheckedStatus(true);
  // The empty dependency array [] ensures this effect only runs exactly once when the component initially mounts.
  }, []);

  // Memoizes the calculation for 'requiresInstallWall' to avoid unnecessary re-evaluations on every render, recalculating only when its dependencies change.
  const requiresInstallWall = useMemo(() => {
    // Immediately returns false if the status hasn't been checked yet, preventing the install wall from flashing on the screen before the environment is fully verified.
    if (!hasCheckedStatus) {
      return false;
    }
    // Returns true if the device is a mobile device AND it is NOT currently running in standalone mode, meaning mobile web browser users are prompted to install.
    return isMobileDevice && !isStandalone;
  // Declares dependencies so the memoized value recalculates if the check status, device type, or standalone mode state changes.
  }, [hasCheckedStatus, isMobileDevice, isStandalone]);

  // Returns the final aggregated object containing all derived environmental flags and state values, matching the AppInstallStatus interface.
  return {
    isMobileDevice,
    isIOS,
    isAndroid,
    isStandalone,
    requiresInstallWall,
    hasCheckedStatus,
  };
};

