const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { RoomManager } = require('./rooms');
const { DrawingState } = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.static(path.join(__dirname, '../client')));

const roomManager = new RoomManager();
const drawingState = new DrawingState();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    const userColor = generateRandomColor();
    roomManager.addUser(socket.id, userColor);

    socket.emit('init_state', {
        operations: drawingState.getOperations(),
        users: roomManager.getUsers()
    });

    io.emit('user_list', {
        users: roomManager.getUsers()
    });

    socket.broadcast.emit('user_joined', {
        userId: socket.id,
        color: userColor
    });

    socket.on('start_stroke', (point) => {
        socket.broadcast.emit('remote_stroke_start', {
            userId: socket.id,
            point
        });
    });

    socket.on('draw_point', (point) => {
        socket.broadcast.emit('remote_draw_point', {
            userId: socket.id,
            point
        });
    });

    socket.on('end_stroke', (data) => {
        const operation = drawingState.addStroke(data.stroke, socket.id);

        socket.broadcast.emit('remote_stroke_end', {
            id: operation.id,
            stroke: operation.stroke,
            userId: socket.id
        });
    });

    socket.on('cursor_move', (position) => {
        socket.broadcast.emit('remote_cursor_move', {
            userId: socket.id,
            position,
            color: userColor
        });
    });

    socket.on('undo', () => {
        const success = drawingState.undo();
        if (success) {
            io.emit('remote_undo', {
                operations: drawingState.getOperations()
            });
        }
    });

    socket.on('redo', () => {
        const success = drawingState.redo();
        if (success) {
            io.emit('remote_redo', {
                operations: drawingState.getOperations()
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        roomManager.removeUser(socket.id);

        io.emit('user_list', {
            users: roomManager.getUsers()
        });

        io.emit('user_left', {
            userId: socket.id
        });
    });
});

function generateRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
