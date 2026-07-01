local dashboard = require("ui.dashboard_view")
local socket = require("api.socket_client")

function love.load()
    socket.connect("wss://zync-meet.com")
end

function love.update(dt)
    -- Poll socket events
end

function love.draw()
    dashboard.draw()
end
