import { CanvasManager } from './canvas.js';
import { WebSocketManager } from './websocket.js';

class CollaborativeCanvas {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.cursorCanvas = document.getElementById('cursor-canvas');
        this.canvasManager = new CanvasManager(this.canvas, this.cursorCanvas);

        const serverUrl = window.location.origin;
        this.wsManager = new WebSocketManager(serverUrl);

        this.remoteStrokes = new Map();
        this.cursorMoveThrottle = null;

        this.setupUIEventListeners();
        this.setupCanvasCallbacks();
        this.setupWebSocketCallbacks();
    }

    setupUIEventListeners() {
        const brushTool = document.getElementById('brush-tool');
        const eraserTool = document.getElementById('eraser-tool');
        const colorPicker = document.getElementById('color-picker');
        const strokeWidth = document.getElementById('stroke-width');
        const widthDisplay = document.getElementById('width-display');
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        brushTool.addEventListener('click', () => {
            this.canvasManager.setTool('brush');
            brushTool.classList.add('active');
            eraserTool.classList.remove('active');
        });

        eraserTool.addEventListener('click', () => {
            this.canvasManager.setTool('eraser');
            eraserTool.classList.add('active');
            brushTool.classList.remove('active');
        });

        colorPicker.addEventListener('change', (e) => {
            this.canvasManager.setColor(e.target.value);
        });

        strokeWidth.addEventListener('input', (e) => {
            const width = parseInt(e.target.value);
            this.canvasManager.setWidth(width);
            widthDisplay.textContent = `${width}px`;
        });

        undoBtn.addEventListener('click', () => {
            this.wsManager.emitUndo();
        });

        redoBtn.addEventListener('click', () => {
            this.wsManager.emitRedo();
        });
    }

    setupCanvasCallbacks() {
        this.canvasManager.onStrokeStart = (point) => {
            this.wsManager.emitStrokeStart(point);
        };

        this.canvasManager.onDrawPoint = (point) => {
            this.wsManager.emitDrawPoint(point);
        };

        this.canvasManager.onStrokeEnd = (stroke) => {
            this.wsManager.emitStrokeEnd(stroke);
        };

        this.canvasManager.onCursorMove = (position) => {
            if (this.cursorMoveThrottle) {
                clearTimeout(this.cursorMoveThrottle);
            }

            this.cursorMoveThrottle = setTimeout(() => {
                this.wsManager.emitCursorMove(position);
            }, 50);
        };
    }

    setupWebSocketCallbacks() {
        this.wsManager.onConnect = () => {
            console.log('Connected to collaborative canvas');
        };

        this.wsManager.onInitState = (data) => {
            this.canvasManager.setOperations(data.operations);
            this.updateUserList(data.users);
        };

        this.wsManager.onRemoteStrokeStart = (data) => {
            this.remoteStrokes.set(data.userId, [data.point]);
        };

        this.wsManager.onRemoteDrawPoint = (data) => {
            const stroke = this.remoteStrokes.get(data.userId);
            if (stroke) {
                const lastPoint = stroke[stroke.length - 1];
                stroke.push(data.point);
                this.canvasManager.drawLine(lastPoint, data.point);
            }
        };

        this.wsManager.onRemoteStrokeEnd = (data) => {
            this.remoteStrokes.delete(data.userId);
            this.canvasManager.addOperation({
                id: data.id,
                stroke: data.stroke,
                userId: data.userId
            });
        };

        this.wsManager.onRemoteCursorMove = (data) => {
            this.canvasManager.updateRemoteCursor(
                data.userId,
                data.position,
                data.color
            );
        };

        this.wsManager.onRemoteUndo = (data) => {
            this.canvasManager.setOperations(data.operations);
        };

        this.wsManager.onRemoteRedo = (data) => {
            this.canvasManager.setOperations(data.operations);
        };

        this.wsManager.onUserList = (data) => {
            this.updateUserList(data.users);
        };

        this.wsManager.onUserJoined = (data) => {
            console.log(`User ${data.userId} joined`);
        };

        this.wsManager.onUserLeft = (data) => {
            this.canvasManager.removeRemoteCursor(data.userId);
            console.log(`User ${data.userId} left`);
        };
    }

    updateUserList(users) {
        const userList = document.getElementById('user-list');
        const userCount = document.getElementById('user-count');

        userList.innerHTML = '';
        userCount.textContent = `Users online: ${users.length}`;

        users.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="user-color" style="background-color: ${user.color}"></span>
                <span>User ${user.id.substring(0, 8)}</span>
            `;
            userList.appendChild(li);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CollaborativeCanvas();
});
