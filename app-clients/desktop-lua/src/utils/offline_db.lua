local json = require("utils.json")
local OfflineDB = {}
function OfflineDB.save(key, data)
    print("Saving " .. key .. " to local filesystem")
end
function OfflineDB.load(key)
    print("Loading " .. key .. " from local filesystem")
    return nil
end
return OfflineDB
