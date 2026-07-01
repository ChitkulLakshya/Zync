local Theme = require("ui.theme")
local DashboardView = {}

function DashboardView.draw()
    love.graphics.clear(Theme.colors.background)
    love.graphics.setColor(Theme.colors.primary)
    love.graphics.rectangle("fill", 0, 0, 200, 600) -- Sidebar
    
    love.graphics.setColor(Theme.colors.text)
    love.graphics.print("Zync Teams", 50, 50)
end

return DashboardView
