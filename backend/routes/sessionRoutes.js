const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// Start a new session
router.post('/start', async (req, res) => {
  try {
    // console.log('POST /api/sessions/start body:', req.body);

    if (!req.body) {
      console.error('Request body is missing');
      return res.status(400).json({ message: 'Request body is missing' });
    }

    const { userId } = req.body;

    if (!userId) {
      console.error('User ID is missing in request body');
      return res.status(400).json({ message: 'User ID required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const session = new Session({
      userId,
      startTime: new Date(),
      endTime: new Date(),
      date: today
    });

    await session.save();
    // console.log('Session started successfully:', session._id);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    // Ensure we don't try to send a response if one was already sent (though unlikely here)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});
// Get sessions for multiple users (Batch)
router.post('/batch', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds array is required' });
    }
    const sessions = await Session.find({ userId: { $in: userIds } }).sort({ startTime: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching batch sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update session (heartbeat) - Support both PUT and POST (for sendBeacon)
const updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    session.endTime = new Date();

    // Update activity stats if provided
    if (req.body && req.body.lastAction) {
      session.lastAction = req.body.lastAction;
    }
    if (req.body && req.body.activeIncrement) {
      session.activeDuration = (session.activeDuration || 0) + req.body.activeIncrement;
    }

    await session.save();

    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.put('/:id', updateSession);
router.post('/:id', updateSession);

// Get user sessions
router.get('/:userId', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.params.userId }).sort({ startTime: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Delete a specific session
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all sessions for a user
router.delete('/user/:userId', async (req, res) => {
  try {
    await Session.deleteMany({ userId: req.params.userId });
    res.json({ message: 'All sessions deleted' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
