import { useEffect, useMemo, useState } from "react";

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;

export interface AppInstallStatus {
  isMobileDevice: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  requiresInstallWall: boolean;
  hasCheckedStatus: boolean;
}

export const useAppInstallStatus = (): AppInstallStatus => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  const userAgent = navigator.userAgent || "";
  const isiPadOSDesktopUA = /Macintosh/i.test(userAgent) && (navigator.maxTouchPoints || 0) > 1;
  const isMobileDevice = MOBILE_UA_REGEX.test(userAgent) || isiPadOSDesktopUA;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) || isiPadOSDesktopUA;
  const isAndroid = /Android/i.test(userAgent);

  useEffect(() => {
    const standaloneByDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
    const standaloneByIOS = Boolean(window.navigator.standalone);

    setIsStandalone(standaloneByDisplayMode || standaloneByIOS);
    setHasCheckedStatus(true);
  }, []);

  const requiresInstallWall = useMemo(() => {
    if (!hasCheckedStatus) {
      return false;
    }
    return isMobileDevice && !isStandalone;
  }, [hasCheckedStatus, isMobileDevice, isStandalone]);

  return {
    isMobileDevice,
    isIOS,
    isAndroid,
    isStandalone,
    requiresInstallWall,
    hasCheckedStatus,
  };
};

