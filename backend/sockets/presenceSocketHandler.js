const onlineUsers = new Map();

module.exports = (io) => {
    const presenceNamespace = io.of('/presence');

    presenceNamespace.on('connection', async (socket) => {
        const { userId } = socket.handshake.query;

        if (!userId) {
            socket.disconnect();
            return;
        }

        socket.join(userId);


        const now = new Date();
        onlineUsers.set(userId, { status: 'online', lastSeen: now });


        const initialStatus = [];
        for (const [uid, data] of onlineUsers.entries()) {
            if (uid !== userId) {
                initialStatus.push({ uid, ...data });
            }
        }
        socket.emit('initial-status', initialStatus);


        socket.broadcast.emit('user-status-changed', {
            userId,
            status: 'online',
            lastSeen: now
        });

        socket.on('disconnect', async () => {
            const now = new Date();
            onlineUsers.set(userId, { status: 'offline', lastSeen: now });

            socket.broadcast.emit('user-status-changed', {
                userId,
                status: 'offline',
                lastSeen: now
            });


            setTimeout(() => {
                const entry = onlineUsers.get(userId);
                if (entry && entry.status === 'offline') {
                    onlineUsers.delete(userId);
                }
            }, 30000);
        });


        socket.on('update-status', async (newStatus) => {
            const now = new Date();
            onlineUsers.set(userId, { status: newStatus, lastSeen: now });

            socket.broadcast.emit('user-status-changed', {
                userId,
                status: newStatus,
                lastSeen: now
            });
        });
    });
};
