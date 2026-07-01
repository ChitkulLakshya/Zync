local Theme = require("ui.theme")
local KanbanView = {}

function KanbanView.draw(columns)
    local x_offset = 220
    love.graphics.setColor(Theme.colors.surface)
    for i=1, 3 do
        love.graphics.rectangle("fill", x_offset, 20, 250, 500, 10, 10)
        x_offset = x_offset + 270
    end
end

return KanbanView
