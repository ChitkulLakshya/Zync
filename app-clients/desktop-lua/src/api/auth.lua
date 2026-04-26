local http = require("api.httpClient")
local json = require("utils.json")

local AuthApi = {}

function AuthApi.login(email, password)
    local payload = json.encode({ email = email, passwordHash = password })
    -- Simulating HTTP POST
    local response = http.request("/api/users/login", "POST", payload)
    
    if response.status == 200 then
        return json.decode(response.body)
    else
        error("Login failed: " .. response.status)
    end
end

function AuthApi.register(name, email, password)
    local payload = json.encode({ name = name, email = email, passwordHash = password })
    return http.request("/api/users/register", "POST", payload)
end

return AuthApi
