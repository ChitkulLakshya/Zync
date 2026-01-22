const User = require('../models/User');

module.exports = (io) => {
    const presenceNamespace = io.of('/presence');

    presenceNamespace.on('connection', async (socket) => {
        const { userId } = socket.handshake.query;

        if (!userId) {
            // console.log('Presence socket connection rejected: No userId');
            socket.disconnect();
            return;
        }

        // console.log(`User ${userId} connected to presence`);
        socket.join(userId);

        // Update Status to Online
        try {
            const now = new Date();
            await User.findOneAndUpdate(
                { uid: userId },
                {
                    status: 'online',
                    lastSeen: now
                }
            );

            // Send initial state of ALL online users to this new client
            // This fixes "other users appearing offline" bug
            const onlineUsers = await User.find({
                status: { $in: ['online', 'away'] },
                uid: { $ne: userId } // exclude self
            }).select('uid status lastSeen');

            socket.emit('initial-status', onlineUsers);

            // Broadcast to everyone
            socket.broadcast.emit('user-status-changed', {
                userId,
                status: 'online',
                lastSeen: now
            });

        } catch (err) {
            console.error('Error updating user status:', err);
        }

        socket.on('disconnect', async () => {
            // console.log(`User ${userId} disconnected from presence`);
            try {
                const now = new Date();
                await User.findOneAndUpdate(
                    { uid: userId },
                    {
                        status: 'offline',
                        lastSeen: now
                    }
                );

                socket.broadcast.emit('user-status-changed', {
                    userId,
                    status: 'offline',
                    lastSeen: now
                });
            } catch (err) {
                console.error('Error updating user status on disconnect:', err);
            }
        });

        // Handle explicit status updates (e.g. set to 'away')
        socket.on('update-status', async (newStatus) => {
            try {
                const now = new Date();
                await User.findOneAndUpdate(
                    { uid: userId },
                    {
                        status: newStatus,
                        lastSeen: now // Optional: does changing status update lastSeen? Maybe.
                    }
                );

                socket.broadcast.emit('user-status-changed', {
                    userId,
                    status: newStatus,
                    lastSeen: now
                });
            } catch (err) {
                console.error('Failed to update status manually', err);
            }
        });
    });
};
