local SocketClient = {}
function SocketClient.connect(url)
    print("Connecting to Zync WebSocket at " .. url)
end
return SocketClient

function SocketClient.on(event, callback)
    print("Listening to socket event: " .. event)
end
