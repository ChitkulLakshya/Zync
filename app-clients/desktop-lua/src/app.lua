-- Main Application Entry for Desktop
local dashboard = require("ui.dashboard_view")
function love.draw()
    dashboard.render()
end

local socket = require("api.socket_client")
function love.load()
    socket.connect("wss://zync-meet.com")
end
