const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// MongoDB connection URI (MongoDB Atlas URI or Local MongoDB URI)
const mongoURI = 'mongodb+srv://<your-mongodb-uri>'; // Replace with your MongoDB URI
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('Connected to MongoDB');
});

// Vote Schema definition
const voteSchema = new mongoose.Schema({
    voterIP: String,
    voterAgent: String,
    selectedCandidates: [String],
    timestamp: { type: Date, default: Date.now },
});

const Vote = mongoose.model('Vote', voteSchema);

// Middleware
app.use(cors());
app.use(express.json());

// Route to save vote
app.post('/vote', async (req, res) => {
    const voterIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const voterAgent = req.headers['user-agent'];
    const { selectedCandidates } = req.body;

    if (!selectedCandidates || selectedCandidates.length !== 2) {
        return res.status(400).send('Invalid vote submission.');
    }

    const newVote = new Vote({
        voterIP,
        voterAgent,
        selectedCandidates,
    });

    try {
        await newVote.save();
        res.send('Vote saved successfully!');
    } catch (error) {
        console.error('Error saving vote:', error);
        res.status(500).send('Error saving vote.');
    }
});

// Route to get all votes (only accessible with a valid JWT token)
const JWT_SECRET = 'your-secret-key';
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send('Access denied: No token provided');

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Access denied: Invalid token');
        req.user = user;
        next();
    });
};

// Get votes data route (protected)
app.get('/votes', authenticateToken, async (req, res) => {
    try {
        const votes = await Vote.find();
        res.json(votes);
    } catch (error) {
        console.error('Error fetching votes:', error);
        res.status(500).send('Error fetching votes.');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
