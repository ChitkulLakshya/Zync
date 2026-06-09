import { useState, useCallback, useRef } from "react";

export function useSectionTransitionLoader(_scope: string = "default") {
  const [showCompactSpinner, setShowCompactSpinner] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginTransition = useCallback((_transition: string) => {
    // Clear any existing transition timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set loading state
    setShowCompactSpinner(true);

    // Mimic the loading duration (e.g. 500ms) then fade out/complete loading
    timeoutRef.current = setTimeout(() => {
      setShowCompactSpinner(false);
    }, 500);
  }, []);

  return {
    beginTransition,
    showCompactSpinner,
  };
}
