const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const verifyToken = require('../middleware/authMiddleware');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');


router.use(verifyToken);


router.post('/start', async (req, res) => {
  try {
    const userId = req.user.uid;

    if (!userId) {
      console.error('User ID missing from token');
      return res.status(400).json({ message: 'User ID required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const session = await Session.create({
      userId,
      startTime: new Date(),
      endTime: new Date(),
      date: today
    });

    res.status(201).json(normalizeDoc(session.toObject()));
  } catch (error) {
    console.error('Error starting session:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});


router.post('/batch', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds array is required' });
    }
    const sessions = await Session.find({ userId: { $in: userIds } })
      .sort({ startTime: -1 })
      .lean();
    const { items, pagination } = paginateArray(normalizeDocs(sessions), req.query);
    setPaginationHeaders(res, pagination);

    res.json(items);
  } catch (error) {
    console.error('Error fetching batch sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


const updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized access to session' });
    }

    const updateData = { endTime: new Date() };

    if (req.body && req.body.lastAction) {
      updateData.lastAction = req.body.lastAction;
    }
    if (req.body && req.body.activeIncrement) {
      updateData.activeDuration = (session.activeDuration || 0) + req.body.activeIncrement;
    }

    const startTime = session.startTime;
    updateData.duration = Math.round((updateData.endTime - startTime) / 1000);

    const updated = await Session.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after', lean: true }
    );

    res.json(normalizeDoc(updated));
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

router.put('/:id', updateSession);
router.post('/:id', updateSession);


router.get('/:userId', async (req, res) => {
  try {
    if (req.params.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized access to user sessions' });
    }

    const sessions = await Session.find({ userId: req.params.userId })
      .sort({ startTime: -1 })
      .lean();
    const { items, pagination } = paginateArray(normalizeDocs(sessions), req.query);
    setPaginationHeaders(res, pagination);

    res.json(items);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized to delete this session' });
    }

    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/user/:userId', async (req, res) => {
  try {
    if (req.params.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    await Session.deleteMany({ userId: req.params.userId });
    res.json({ message: 'All sessions deleted' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
