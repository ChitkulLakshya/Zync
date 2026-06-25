package com.zync.android.api
class SocketManager {
    fun connect() { println("Connecting to Zync Socket.IO Server") }
    fun disconnect() { println("Disconnecting Socket") }
}

    fun listenForBoardUpdates(onUpdate: (String) -> Unit) {
        println("Listening for board updates...")
    }
