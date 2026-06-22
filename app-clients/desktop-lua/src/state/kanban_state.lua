local projects = require("api.projects")
local state = { activeBoard = nil, tasks = {} }
function state.loadBoard(token, teamId)
    state.activeBoard = projects.getProjects(token, teamId)[1]
end
return state
