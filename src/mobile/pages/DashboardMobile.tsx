// Imports the primary Dashboard component from the shared pages directory.
import Dashboard from "@/pages/Dashboard";

// Defines a lightweight wrapper component for mobile routing, passing through to the responsive dashboard.
const DashboardMobile = () => <Dashboard />;

// Exports the mobile wrapper for the router.
export default DashboardMobile;
