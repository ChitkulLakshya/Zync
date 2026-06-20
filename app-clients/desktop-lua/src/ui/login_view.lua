local components = require("ui.components")
local authApi = require("api.auth")
local session = require("state.session")

local LoginView = {}

function LoginView.render()
    print("=== Zync Firebase Sync ===")
    components.drawTextField("Email", 10, 20, 200)
    components.drawTextField("Password (Firebase)", 10, 60, 200)
    
    components.drawButton("Log In", 10, 100, function()
        print("Mocking Firebase Login -> Sync...")
        local success, result = pcall(authApi.sync, "mock_firebase_token", "test_uid", "test@zync-meet.com", "Test User")
        if success then
            session.saveToken("mock_firebase_token")
            print("Sync successful!")
        else
            print("Error: " .. tostring(result))
        end
    end)
end

return LoginView
