import { useState, useCallback, useRef } from 'react';

export function useSectionTransitionLoader(_scope: string = 'default') {
  const [showCompactSpinner, setShowCompactSpinner] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginTransition = useCallback((_transition: string) => {

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }


    setShowCompactSpinner(true);


    timeoutRef.current = setTimeout(() => {
      setShowCompactSpinner(false);
    }, 500);
  }, []);

  return {
    beginTransition,
    showCompactSpinner,
  };
}
