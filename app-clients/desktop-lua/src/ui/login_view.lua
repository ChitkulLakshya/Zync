local components = require("ui.components")
local authApi = require("api.auth")
local session = require("state.session")

local LoginView = {}

function LoginView.render()
    print("=== Zync Login ===")
    components.drawTextField("Email", 10, 20, 200)
    components.drawTextField("Password", 10, 60, 200)
    
    components.drawButton("Log In", 10, 100, function()
        print("Attempting login...")
        local success, result = pcall(authApi.login, "test@zync-meet.com", "password")
        if success then
            session.saveToken(result.token)
            print("Login successful!")
        else
            print("Error: " .. tostring(result))
        end
    end)
end

return LoginView
