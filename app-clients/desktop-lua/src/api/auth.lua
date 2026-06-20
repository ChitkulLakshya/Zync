local http = require("api.httpClient")
local json = require("utils.json")

local AuthApi = {}

-- Zync backend uses Firebase Auth, so desktop client must sync the user token
function AuthApi.sync(firebaseToken, uid, email, displayName)
    local payload = json.encode({ uid = uid, email = email, displayName = displayName })
    
    -- Passing the token in the header would happen in the HTTP client implementation
    local headers = { ["Authorization"] = "Bearer " .. firebaseToken }
    local response = http.request("/api/users/sync", "POST", payload, headers)
    
    if response.status == 200 then
        return json.decode(response.body)
    else
        error("Sync failed: " .. response.status)
    end
end

return AuthApi
