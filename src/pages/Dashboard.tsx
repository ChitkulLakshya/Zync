import { useIsMobile } from "@/hooks/use-mobile";
import DesktopView from "@/components/views/DesktopView";
import MobileView from "@/components/views/MobileView";

const Dashboard = () => {
  // What: Hook to detect if the user's viewport is currently mobile-sized.
  // Why: This allows us to conditionally render different layouts optimized for the device.
  const isMobile = useIsMobile();

  // What: Conditional check for the mobile viewport.
  // Why: If the user is on mobile, we return a specialized mobile view component instead of the desktop one.
  if (isMobile) {
    return <MobileView />;
  }

  // What: Fallback to the desktop view.
  // Why: If the previous condition wasn't met, the viewport is considered desktop or tablet, and we render the desktop-specific UI.
  return <DesktopView />;
};

export default Dashboard;
