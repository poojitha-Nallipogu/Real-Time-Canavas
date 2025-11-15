# Complete Code Explanation

This document provides a detailed walkthrough of how all the code components work together to create the collaborative canvas application.

## Application Flow

### 1. Server Startup (`server/server.js`)

```javascript
// Creates Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Attaches Socket.io for WebSocket support
const io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Serves static files from client/ directory
app.use(express.static(path.join(__dirname, '../client')));

// Initializes state managers
const roomManager = new RoomManager();      // Tracks users
const drawingState = new DrawingState();    // Tracks operations
```

**What happens:**
- Express serves HTML/CSS/JS files from `client/` folder
- Socket.io enables real-time WebSocket connections
- Two manager classes track application state

### 2. User Opens Browser (`client/index.html`)

```html
<canvas id="canvas"></canvas>
<canvas id="cursor-canvas"></canvas>
<script src="/socket.io/socket.io.js"></script>
<script type="module" src="main.js"></script>
```

**What happens:**
- Two canvases: one for drawing, one for cursors
- Socket.io client library loads
- Main.js initializes the application

### 3. Application Initialization (`client/main.js`)

```javascript
class CollaborativeCanvas {
    constructor() {
        // Create canvas manager
        this.canvasManager = new CanvasManager(canvas, cursorCanvas);

        // Create WebSocket manager
        this.wsManager = new WebSocketManager(serverUrl);

        // Connect the two via callbacks
        this.setupCanvasCallbacks();
        this.setupWebSocketCallbacks();
        this.setupUIEventListeners();
    }
}
```

**What happens:**
- `CanvasManager` handles all drawing logic
- `WebSocketManager` handles all network communication
- Main controller connects them via callbacks

### 4. WebSocket Connection (`client/websocket.js` + `server/server.js`)

**Client Side:**
```javascript
constructor(serverUrl) {
    this.socket = io(serverUrl);  // Connects to server
    this.setupEventListeners();    // Registers event handlers
}
```

**Server Side:**
```javascript
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Assign random color
    const userColor = generateRandomColor();
    roomManager.addUser(socket.id, userColor);

    // Send initial state
    socket.emit('init_state', {
        operations: drawingState.getOperations(),
        users: roomManager.getUsers()
    });

    // Notify others
    io.emit('user_list', { users: roomManager.getUsers() });
    socket.broadcast.emit('user_joined', { userId: socket.id, color: userColor });
});
```

**What happens:**
1. Client connects to server via Socket.io
2. Server generates random color for user
3. Server adds user to room manager
4. Server sends full canvas state (all operations) to new user
5. Server broadcasts updated user list to everyone
6. Other users see "User joined" notification

### 5. Initial Canvas Rendering (`client/canvas.js`)

**When `init_state` arrives:**
```javascript
this.wsManager.onInitState = (data) => {
    this.canvasManager.setOperations(data.operations);
    this.updateUserList(data.users);
};
```

**In CanvasManager:**
```javascript
setOperations(operations) {
    this.operations = operations;
    this.redoStack = [];
    this.redrawCanvas();  // Rebuilds entire canvas
}

redrawCanvas() {
    ctx.clearRect(0, 0, width, height);     // Clear canvas
    ctx.fillRect(0, 0, width, height);      // White background

    // Draw every operation in order
    for (const operation of this.operations) {
        this.drawStroke(operation.stroke);
    }
}

drawStroke(stroke) {
    // Draw line between each consecutive point
    for (let i = 1; i < stroke.length; i++) {
        this.drawLine(stroke[i - 1], stroke[i]);
    }
}

drawLine(from, to) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = to.tool === 'eraser' ? '#FFFFFF' : to.color;
    ctx.lineWidth = to.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}
```

**What happens:**
1. Canvas receives all past operations
2. Clears canvas completely
3. Redraws every stroke in chronological order
4. User sees complete drawing history

## Drawing Flow (Three Phases)

### Phase 1: Start Stroke (mousedown)

**Client (`canvas.js`):**
```javascript
handleMouseDown(e) {
    this.isDrawing = true;
    const point = this.getMousePos(e);

    this.currentStroke = [{
        x: point.x,
        y: point.y,
        color: this.currentColor,
        width: this.currentWidth,
        tool: this.currentTool
    }];

    if (this.onStrokeStart) {
        this.onStrokeStart(this.currentStroke[0]);
    }
}
```

**Main Controller (`main.js`):**
```javascript
this.canvasManager.onStrokeStart = (point) => {
    this.wsManager.emitStrokeStart(point);
};
```

**WebSocket (`websocket.js`):**
```javascript
emitStrokeStart(point) {
    this.socket.emit('start_stroke', point);
}
```

**Server (`server.js`):**
```javascript
socket.on('start_stroke', (point) => {
    socket.broadcast.emit('remote_stroke_start', {
        userId: socket.id,
        point
    });
});
```

**Other Clients (`main.js`):**
```javascript
this.wsManager.onRemoteStrokeStart = (data) => {
    this.remoteStrokes.set(data.userId, [data.point]);
};
```

**What happens:**
1. User presses mouse button
2. Client captures first point with current tool settings
3. Client sends `start_stroke` to server
4. Server broadcasts to all other clients
5. Other clients initialize a stroke buffer for this user

### Phase 2: Drawing (mousemove)

**Client (`canvas.js`):**
```javascript
handleMouseMove(e) {
    const point = this.getMousePos(e);

    // Send cursor position (throttled)
    if (this.onCursorMove) {
        this.onCursorMove(point);
    }

    if (!this.isDrawing) return;

    const newPoint = { x: point.x, y: point.y, color: this.currentColor, ... };
    this.currentStroke.push(newPoint);

    // Draw locally immediately (optimistic rendering)
    this.drawLine(
        this.currentStroke[this.currentStroke.length - 2],
        newPoint
    );

    // Send to server
    if (this.onDrawPoint) {
        this.onDrawPoint(newPoint);
    }
}
```

**Server:**
```javascript
socket.on('draw_point', (point) => {
    socket.broadcast.emit('remote_draw_point', {
        userId: socket.id,
        point
    });
});
```

**Other Clients:**
```javascript
this.wsManager.onRemoteDrawPoint = (data) => {
    const stroke = this.remoteStrokes.get(data.userId);
    if (stroke) {
        const lastPoint = stroke[stroke.length - 1];
        stroke.push(data.point);

        // Draw incrementally
        this.canvasManager.drawLine(lastPoint, data.point);
    }
};
```

**What happens:**
1. User moves mouse while drawing
2. Client draws line immediately (no lag)
3. Client sends point to server
4. Server broadcasts to others
5. Others draw line from previous point to new point
6. Smooth real-time drawing across all clients

### Phase 3: End Stroke (mouseup)

**Client (`canvas.js`):**
```javascript
handleMouseUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentStroke.length > 0) {
        if (this.onStrokeEnd) {
            this.onStrokeEnd(this.currentStroke);
        }
    }

    this.currentStroke = [];
}
```

**Server:**
```javascript
socket.on('end_stroke', (data) => {
    // Add to permanent operations list
    const operation = drawingState.addStroke(data.stroke, socket.id);

    // Broadcast complete stroke
    socket.broadcast.emit('remote_stroke_end', {
        id: operation.id,
        stroke: operation.stroke,
        userId: socket.id
    });
});
```

**Drawing State (`drawing-state.js`):**
```javascript
addStroke(stroke, userId) {
    const operation = {
        id: this.operationIdCounter++,
        stroke: stroke,
        userId: userId,
        timestamp: Date.now()
    };

    this.operations.push(operation);
    this.redoStack = [];  // Clear redo history

    return operation;
}
```

**Other Clients:**
```javascript
this.wsManager.onRemoteStrokeEnd = (data) => {
    this.remoteStrokes.delete(data.userId);  // Clean up temp buffer

    // Add to permanent operations
    this.canvasManager.addOperation({
        id: data.id,
        stroke: data.stroke,
        userId: data.userId
    });
};
```

**What happens:**
1. User releases mouse button
2. Client finalizes stroke
3. Client sends complete stroke to server
4. Server assigns unique ID and timestamp
5. Server adds to operations list
6. Server broadcasts to all others
7. All clients add to their operations list
8. Stroke is now permanent and will survive undo/redo

## Cursor Sharing

**Client sends cursor position:**
```javascript
this.canvasManager.onCursorMove = (position) => {
    // Throttle to 50ms (20 updates/second)
    if (this.cursorMoveThrottle) {
        clearTimeout(this.cursorMoveThrottle);
    }

    this.cursorMoveThrottle = setTimeout(() => {
        this.wsManager.emitCursorMove(position);
    }, 50);
};
```

**Server broadcasts:**
```javascript
socket.on('cursor_move', (position) => {
    socket.broadcast.emit('remote_cursor_move', {
        userId: socket.id,
        position,
        color: userColor  // From room manager
    });
});
```

**Other clients render cursors:**
```javascript
this.wsManager.onRemoteCursorMove = (data) => {
    this.canvasManager.updateRemoteCursor(
        data.userId,
        data.position,
        data.color
    );
};

// In CanvasManager:
updateRemoteCursor(userId, position, color) {
    this.remoteCursors.set(userId, { position, color });
    this.drawCursors();
}

drawCursors() {
    cursorCtx.clearRect(0, 0, width, height);

    for (const [userId, data] of this.remoteCursors) {
        // Draw colored circle
        cursorCtx.beginPath();
        cursorCtx.arc(data.position.x, data.position.y, 5, 0, 2 * Math.PI);
        cursorCtx.fillStyle = data.color;
        cursorCtx.fill();

        // White border
        cursorCtx.strokeStyle = 'white';
        cursorCtx.lineWidth = 2;
        cursorCtx.stroke();
    }
}
```

**What happens:**
1. User moves cursor (fires many times per second)
2. Client throttles to max 20 updates/second
3. Client sends position to server
4. Server broadcasts with user's color
5. Other clients render colored dot on cursor canvas
6. Cursor canvas is transparent overlay (doesn't affect drawing)

## Global Undo/Redo

### Undo Operation

**User clicks undo button:**
```javascript
undoBtn.addEventListener('click', () => {
    this.wsManager.emitUndo();
});
```

**Server processes undo:**
```javascript
socket.on('undo', () => {
    const success = drawingState.undo();

    if (success) {
        // Send new operations list to EVERYONE (including sender)
        io.emit('remote_undo', {
            operations: drawingState.getOperations()
        });
    }
});
```

**Drawing State:**
```javascript
undo() {
    if (this.operations.length === 0) {
        return false;
    }

    // Pop last operation
    const operation = this.operations.pop();

    // Push to redo stack
    this.redoStack.push(operation);

    return true;
}
```

**All clients rebuild canvas:**
```javascript
this.wsManager.onRemoteUndo = (data) => {
    this.canvasManager.setOperations(data.operations);
};

// In CanvasManager:
setOperations(operations) {
    this.operations = operations;
    this.redoStack = [];
    this.redrawCanvas();  // Complete rebuild
}
```

**What happens:**
1. Any user clicks undo
2. Server removes last operation from list
3. Server sends new operations list to ALL users
4. Every user clears canvas and redraws from operations
5. Last stroke disappears for everyone simultaneously

### Redo Operation

Same process but reversed:
- Pop from redo stack
- Push back to operations
- Broadcast new operations list
- Everyone rebuilds

**Why global?**
- In collaborative environment, unclear whose undo it would be
- Global undo is simpler and more predictable
- All users see same canvas state

## UI Interactions

### Color Picker

```javascript
colorPicker.addEventListener('change', (e) => {
    this.canvasManager.setColor(e.target.value);
});
```

Simple: updates current color in CanvasManager.

### Stroke Width Slider

```javascript
strokeWidth.addEventListener('input', (e) => {
    const width = parseInt(e.target.value);
    this.canvasManager.setWidth(width);
    widthDisplay.textContent = `${width}px`;
});
```

Updates width and display label.

### Tool Selection

```javascript
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
```

Updates current tool and button styling.

### User List Display

```javascript
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
```

Creates list items with colored dots for each user.

## State Managers (Server Side)

### RoomManager (`server/rooms.js`)

```javascript
class RoomManager {
    constructor() {
        this.users = new Map();  // userId -> user data
    }

    addUser(userId, color) {
        this.users.set(userId, {
            id: userId,
            color: color,
            joinedAt: Date.now()
        });
    }

    removeUser(userId) {
        this.users.delete(userId);
    }

    getUsers() {
        return Array.from(this.users.values());
    }
}
```

**Purpose:** Track who's online with their colors.

### DrawingState (`server/drawing-state.js`)

```javascript
class DrawingState {
    constructor() {
        this.operations = [];       // All strokes
        this.redoStack = [];        // Undone strokes
        this.operationIdCounter = 0;  // Unique IDs
    }

    addStroke(stroke, userId) {
        const operation = {
            id: this.operationIdCounter++,
            stroke: stroke,
            userId: userId,
            timestamp: Date.now()
        };

        this.operations.push(operation);
        this.redoStack = [];  // Clear redo on new stroke

        return operation;
    }

    undo() { /* ... */ }
    redo() { /* ... */ }
    getOperations() { /* ... */ }
}
```

**Purpose:** Maintain drawing history and undo/redo stacks.

## Event Flow Summary

### User Draws:
```
User input → Canvas event → CanvasManager
    ↓
Draw locally (optimistic)
    ↓
Callback to Main → WebSocketManager
    ↓
Emit to Server
    ↓
Server broadcasts to others
    ↓
Others receive → CanvasManager draws
```

### User Undos:
```
User clicks undo → Main → WebSocket
    ↓
Server receives
    ↓
Server modifies operations
    ↓
Server broadcasts new operations to ALL
    ↓
Everyone rebuilds canvas
```

### User Joins:
```
New connection → Server
    ↓
Server sends init_state (all operations)
    ↓
Client rebuilds canvas from operations
    ↓
Server broadcasts user_list to everyone
```

## Key Design Decisions

### 1. Two Canvas Elements
- Drawing canvas: Permanent strokes
- Cursor canvas: Temporary cursors (overlaid)
- Why: Avoid redrawing entire canvas to update cursors

### 2. Three-Phase Stroke Protocol
- start_stroke → draw_point (repeated) → end_stroke
- Why: Smooth real-time feedback + efficient bandwidth

### 3. Operations Array
- Single source of truth on server
- Each stroke is one operation
- Why: Simple state management, easy undo/redo

### 4. Optimistic Rendering
- Draw locally immediately, send to server after
- Why: No perceived lag for user

### 5. Global Undo/Redo
- Operations stack, last-in-first-out
- Why: Simple, predictable, consistent state

### 6. In-Memory State
- No database (for simplicity)
- Why: Easier to understand, faster to build

### 7. Single Room
- All users on same canvas
- Why: Simplifies implementation for MVP

## Performance Considerations

### Throttling
- Cursor updates: 50ms (20/sec)
- Could add: Stroke point batching

### Efficient Redrawing
- Only full redraw on: undo, redo, resize, initial load
- During drawing: Incremental line drawing

### Memory Usage
- Each operation: ~1KB (depends on stroke length)
- 1000 operations ≈ 1MB memory

### Network Bandwidth
- Each point: ~50 bytes
- Fast drawing: ~50 points/second = 2.5KB/s
- Cursor: 20 updates/second = 1KB/s
- Total per user drawing: ~3.5KB/s

## Error Handling

### Connection Loss
- Socket.io auto-reconnects
- On reconnect: Treated as new user
- Receives full state via init_state

### Malformed Data
- Current: No validation (risk)
- Production: Validate all incoming messages

### Concurrent Operations
- Last-write-wins
- No conflict resolution needed (independent strokes)

## Conclusion

This architecture demonstrates:
- Clean separation of concerns
- Event-driven design
- Real-time state synchronization
- Optimistic UI updates
- Simple but effective global undo/redo
- Modular, maintainable code

All components work together to create seamless collaborative drawing experience.
