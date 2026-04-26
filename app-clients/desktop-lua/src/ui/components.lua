-- UI Components library for Desktop App
local components = {}

function components.drawTextField(label, x, y, width)
    print("Drawing TextField: " .. label .. " at [" .. x .. "," .. y .. "]")
end

function components.drawButton(label, x, y, callback)
    print("Drawing Button: " .. label .. " at [" .. x .. "," .. y .. "]")
end

return components
