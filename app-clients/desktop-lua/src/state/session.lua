local Session = {
    token = nil,
    currentUser = nil
}

function Session.saveToken(token)
    Session.token = token
    print("Session token saved securely.")
end

function Session.clear()
    Session.token = nil
    Session.currentUser = nil
    print("Session cleared.")
end

function Session.isAuthenticated()
    return Session.token ~= nil
end

return Session
