import Whiteboard from '../models/Whiteboard.js';

// Get whiteboard data by roomId
export const getWhiteboard = async (req, res) => {
  try {
    const whiteboard = await Whiteboard.findOne({ roomId: req.params.roomId });
    if (!whiteboard) {
      return res.status(200).json({ elements: [] });
    }
    res.json(whiteboard);
  } catch (err) {
    console.error('Error fetching whiteboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Save whiteboard data
export const saveWhiteboard = async (req, res) => {
  try {
    const { elements } = req.body;
    const whiteboard = await Whiteboard.findOneAndUpdate(
      { roomId: req.params.roomId },
      { elements, updatedAt: Date.now() },
      { upsert: true, new: true }
    );
    res.json(whiteboard);
  } catch (err) {
    console.error('Error saving whiteboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Initialize socket.io events
export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('draw', async (data) => {
      try {
        socket.to(data.roomId).emit('drawing', data);
        // Real-time persistence
        await Whiteboard.findOneAndUpdate(
          { roomId: data.roomId },
          { $push: { elements: data }, updatedAt: Date.now() },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving drawing:', err);
      }
    });

    socket.on('clear', async (roomId) => {
      try {
        socket.to(roomId).emit('cleared');
        // Clear in database
        await Whiteboard.findOneAndUpdate(
          { roomId },
          { elements: [], updatedAt: Date.now() },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error clearing whiteboard:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};