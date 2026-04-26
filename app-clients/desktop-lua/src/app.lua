local loginView = require("ui.login_view")
local session = require("state.session")

-- Main App Loop
print("Starting Zync Desktop Client...")

if not session.isAuthenticated() then
    loginView.render()
else
    print("Welcome back!")
end
