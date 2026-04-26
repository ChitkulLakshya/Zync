-- User Model
local User = {}
User.__index = User

function User.new(id, email, name, role)
    local self = setmetatable({}, User)
    self.id = id
    self.email = email
    self.name = name
    self.role = role
    return self
end

return User
