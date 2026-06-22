-- Main Application Entry for Desktop
local dashboard = require("ui.dashboard_view")
function love.draw()
    dashboard.render()
end
