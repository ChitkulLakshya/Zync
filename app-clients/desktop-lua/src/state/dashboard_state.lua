local teams = require("api.teams")
local state = { teams = {}, activeTeam = nil }
function state.load(token)
    state.teams = teams.getTeams(token)
end
return state
