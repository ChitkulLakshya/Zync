local teams = require("api.teams")
local state = { teams = {}, activeTeam = nil }
function state.load(token)
    state.teams = teams.getTeams(token)
end
return state

local offline_db = require("utils.offline_db")
function state.cacheTeams()
    offline_db.save("teams", state.teams)
end
