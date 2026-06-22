local http = require("api.httpClient")
local json = require("utils.json")
local MeetingsApi = {}
function MeetingsApi.getMeetings(token)
    local headers = { ["Authorization"] = "Bearer " .. token }
    local res = http.request("/api/meet", "GET", nil, headers)
    return json.decode(res.body)
end
return MeetingsApi
