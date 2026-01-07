const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const Folder = require('../models/Folder');

// --- Folders ---

// Create a new folder
router.post('/folders', async (req, res) => {
  try {
    const { name, ownerId, parentId, type, projectId, color } = req.body;
    
    if (!ownerId) return res.status(400).json({ error: 'Owner ID is required' });

    const folder = new Folder({
      name,
      ownerId,
      parentId: parentId || null,
      type: type || 'personal',
      projectId: projectId || null,
      color
    });

    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all folders for a user
router.get('/folders', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    // Fetch personal folders and any project folders user has access to (simplified for now to just owner)
    const folders = await Folder.find({ ownerId: userId }).sort({ createdAt: -1 });
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- Notes ---

// Create a new note
router.post('/', async (req, res) => {
  try {
    const { title, content, ownerId, folderId, projectId, tags } = req.body;

    if (!ownerId) return res.status(400).json({ error: 'Owner ID is required' });

    const note = new Note({
      title: title || 'Untitled',
      content: content || {},
      ownerId,
      folderId: folderId || null,
      projectId: projectId || null,
      tags: tags || []
    });

    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all notes for a user (optionally filtered by folder)
router.get('/', async (req, res) => {
  try {
    const { userId, folderId } = req.query;
    
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const query = { ownerId: userId };
    
    if (folderId) {
      query.folderId = folderId;
    }

    const notes = await Note.find(query).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single note by ID
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a note
router.put('/:id', async (req, res) => {
  try {
    const { title, content, folderId, isPinned, tags } = req.body;
    
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { 
        ...(title && { title }),
        ...(content && { content }),
        ...(folderId !== undefined && { folderId }),
        ...(isPinned !== undefined && { isPinned }),
        ...(tags && { tags })
      },
      { new: true }
    );

    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
