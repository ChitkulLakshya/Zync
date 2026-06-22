local http = require("api.httpClient")
local json = require("utils.json")
local TeamsApi = {}
function TeamsApi.getTeams(token)
    local headers = { ["Authorization"] = "Bearer " .. token }
    local res = http.request("/api/teams", "GET", nil, headers)
    return json.decode(res.body)
end
return TeamsApi
