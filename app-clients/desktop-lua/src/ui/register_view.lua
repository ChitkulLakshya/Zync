local components = require("ui.components")
local authApi = require("api.auth")

local RegisterView = {}

function RegisterView.render()
    print("=== Zync Register ===")
    components.drawTextField("Full Name", 10, 20, 200)
    components.drawTextField("Email", 10, 60, 200)
    components.drawTextField("Password", 10, 100, 200)
    
    components.drawButton("Sign Up", 10, 140, function()
        print("Attempting registration...")
        authApi.register("Test User", "test@zync-meet.com", "password")
    end)
end

return RegisterView
