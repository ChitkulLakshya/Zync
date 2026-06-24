import React, { useState, useEffect } from 'react';

interface DelayedLoaderGateProps {
  active: boolean;
  delay?: number;
  children: React.ReactNode;
}

export function DelayedLoaderGate({ active, delay = 300, children }: DelayedLoaderGateProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!active) {
      setShouldRender(false);
      return;
    }

    const timer = setTimeout(() => {
      setShouldRender(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [active, delay]);

  if (!active) {
    return null;
  }
  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}
