import { useState, useCallback, useRef } from "react";

export function useSectionTransitionLoader(scope: string = "default") {
  const [showCompactSpinner, setShowCompactSpinner] = useState(false);
  const [showSectionSkeleton, setShowSectionSkeleton] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginTransition = useCallback((transition: string) => {
    // Clear any existing transition timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set loading state
    setShowCompactSpinner(true);
    setShowSectionSkeleton(true);

    // Mimic the loading duration (e.g. 500ms) then fade out/complete loading
    timeoutRef.current = setTimeout(() => {
      setShowCompactSpinner(false);
      setShowSectionSkeleton(false);
    }, 500);
  }, []);

  return {
    beginTransition,
    showCompactSpinner,
    showSectionSkeleton,
  };
}
