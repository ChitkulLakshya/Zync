local projects = require("api.projects")
local state = { activeBoard = nil, tasks = {} }
function state.loadBoard(token, teamId)
    state.activeBoard = projects.getProjects(token, teamId)[1]
end
return state

local offline_db = require("utils.offline_db")
function state.cacheBoard()
    offline_db.save("active_board", state.activeBoard)
end
