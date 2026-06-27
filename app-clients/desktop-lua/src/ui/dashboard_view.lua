local DashboardView = {}
function DashboardView.render()
    print("--- Zync Desktop Dashboard ---")
    print("[1] Teams  [2] Kanban  [3] Meetings")
end
return DashboardView

function DashboardView.renderOfflineBanner()
    print("[OFFLINE MODE - Changes will sync when reconnected]")
end
