const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use('/generated', express.static(path.resolve(__dirname, '../data/generated')));

// Routes
app.use('/api', routes);

// Socket.io 
io.on('connection', (socket) => {
    console.log('Client connected for real-time editing');
    
    // Auth / Subscriptions
    socket.on('join_user_room', (userId) => {
        socket.join('user_' + userId);
        console.log(`User ${userId} joined room user_${userId}`);
    });
    
     socket.on('edit_chapter', async (data) => {
        const { chapterId, fullText } = data;
        if (chapterId && fullText !== undefined) {
             try {
                     const updateCmd = await db.prepare("UPDATE chapters SET full_text = ? WHERE id = ?");
                     await updateCmd.run(fullText, chapterId);
                // console.log(`Chapter ${chapterId} live-saved via Socket!`);
             } catch(err) {
                console.error("Socket DB Save error: ", err);
             }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
});

async function startServer() {
    await db.initSchema();
    server.listen(PORT, () => {
        console.log(`Fablean Memory HTTP/WebSocket Service running on http://localhost:${PORT}`);
    });
}

startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
