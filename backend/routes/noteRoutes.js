const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const Folder = require('../models/Folder');
const verifyToken = require('../middleware/authMiddleware');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');

router.post('/folders', verifyToken, async (req, res) => {
  try {
    const { name, ownerId, parentId, type, projectId, color } = req.body;

    if (ownerId && ownerId !== req.user.uid) {
      return res
        .status(403)
        .json({ error: 'Unauthorized: Cannot create folder for another user' });
    }
    const finalOwnerId = ownerId || req.user.uid;

    const folder = await Folder.create({
      name,
      ownerId: finalOwnerId,
      parentId: parentId || null,
      type: type || 'personal',
      projectId: projectId || null,
      color: color || '#FFFFFF',
    });

    res.status(201).json(normalizeDoc(folder.toObject()));
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({
          error: 'A folder with this name already exists in this location',
        });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/folders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const folders = await Folder.find({
      $or: [{ ownerId: userId }, { collaborators: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const { items, pagination } = paginateArray(
      normalizeDocs(folders),
      req.query
    );
    setPaginationHeaders(res, pagination);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/folders/:id/share', verifyToken, async (req, res) => {
  try {
    const { collaboratorIds } = req.body;
    const { id } = req.params;

    const folderToCheck = await Folder.findById(id).lean();
    if (!folderToCheck)
      return res.status(404).json({ error: 'Folder not found' });

    if (folderToCheck.ownerId !== req.user.uid) {
      return res
        .status(403)
        .json({ error: 'Unauthorized: Only owner can share folder' });
    }

    const existing = folderToCheck.collaborators || [];
    const merged = [...new Set([...existing, ...collaboratorIds])];

    const folder = await Folder.findByIdAndUpdate(
      id,
      { $set: { collaborators: merged } },
      { returnDocument: 'after', lean: true }
    );

    res.json(normalizeDoc(folder));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/folders/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id).lean();
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (folder.ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await Folder.findByIdAndUpdate(
      id,
      { $set: req.body },
      { returnDocument: 'after', lean: true }
    );
    res.json(normalizeDoc(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/folders/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id).lean();
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (folder.ownerId !== req.user.uid) {
      return res
        .status(403)
        .json({ error: 'Unauthorized: Only owner can delete folder' });
    }

    await Note.deleteMany({ folderId: id });
    await Folder.findByIdAndDelete(id);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/folders/:id/unshare', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;
    const folder = await Folder.findById(id).lean();
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (folder.ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await Folder.findByIdAndUpdate(
      id,
      {
        $set: {
          collaborators: (folder.collaborators || []).filter(
            (c) => c !== userId
          ),
        },
      },
      { returnDocument: 'after', lean: true }
    );
    res.json(normalizeDoc(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, content, ownerId, folderId, projectId } = req.body;

    if (ownerId && ownerId !== req.user.uid) {
      return res
        .status(403)
        .json({ error: 'Unauthorized: Cannot create note for another user' });
    }
    const finalOwnerId = ownerId || req.user.uid;

    const note = await Note.create({
      title: title || 'Untitled',
      content: content || {},
      ownerId: finalOwnerId,
      folderId: folderId || null,
      projectId: projectId || null,
    });

    res.status(201).json(normalizeDoc(note.toObject()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { folderId } = req.query;

    if (folderId && typeof folderId !== 'string') {
      return res.status(400).json({ error: 'Invalid Folder ID format' });
    }

    let filter = {};

    if (folderId) {
      const folder = await Folder.findById(folderId).lean();
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      const isOwner = folder.ownerId === userId;
      const isCollaborator =
        folder.collaborators && folder.collaborators.includes(userId);
      if (!isOwner && !isCollaborator) {
        return res.status(403).json({ error: 'Access denied to this folder' });
      }
      filter = { folderId };
    } else {
      const sharedFolders = await Folder.find(
        { collaborators: userId },
        { _id: 1 }
      ).lean();
      const sharedFolderIds = sharedFolders.map((f) => f._id.toString());

      filter = {
        $or: [
          { ownerId: userId },
          { folderId: { $in: sharedFolderIds } },
          { sharedWith: userId },
        ],
      };
    }

    const notes = await Note.find(filter).sort({ updatedAt: -1 }).lean();
    const { items, pagination } = paginateArray(
      normalizeDocs(notes),
      req.query
    );
    setPaginationHeaders(res, pagination);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).lean();
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const isOwner = note.ownerId === req.user.uid;
    const isShared = note.sharedWith && note.sharedWith.includes(req.user.uid);

    if (!isOwner && !isShared) {
      if (note.folderId) {
        const folder = await Folder.findById(note.folderId).lean();
        if (
          folder &&
          (folder.ownerId === req.user.uid ||
            (folder.collaborators &&
              folder.collaborators.includes(req.user.uid)))
        ) {
          // Access via folder collaboration — allowed
        } else {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(normalizeDoc(note));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, content, folderId } = req.body;

    const note = await Note.findById(req.params.id).lean();
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const isOwner = note.ownerId === req.user.uid;
    const isShared = note.sharedWith && note.sharedWith.includes(req.user.uid);

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (folderId !== undefined) updateData.folderId = folderId;

    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after', lean: true }
    );

    res.json(normalizeDoc(updatedNote));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).lean();
    if (!note) return res.status(404).json({ error: 'Note not found' });

    if (note.ownerId !== req.user.uid) {
      return res
        .status(403)
        .json({ error: 'Unauthorized: Only owner can delete note' });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
