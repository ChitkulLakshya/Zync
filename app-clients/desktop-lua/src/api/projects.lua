local http = require("api.httpClient")
local json = require("utils.json")
local ProjectsApi = {}
function ProjectsApi.getProjects(token, teamId)
    local headers = { ["Authorization"] = "Bearer " .. token }
    local res = http.request("/api/projects/team/" .. teamId, "GET", nil, headers)
    return json.decode(res.body)
end
return ProjectsApi
