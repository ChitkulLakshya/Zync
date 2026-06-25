import { useIsMobile } from "@/hooks/use-mobile";
import DesktopView from "@/components/views/DesktopView";
import MobileView from "@/components/views/MobileView";

const Dashboard = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileView />;
  }

  return <DesktopView />;
};

export default Dashboard;
