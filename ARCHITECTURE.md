# Collaborative Canvas - Architecture Documentation

## Overview

This document describes the technical architecture, data flow, and design decisions for the Collaborative Canvas application.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Side                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   main.js    │──│  canvas.js   │──│  HTML5 Canvas   │  │
│  │ (Controller) │  │   (Drawing)  │  │   (Rendering)   │  │
│  └──────┬───────┘  └──────────────┘  └─────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │          websocket.js (Socket.io Client)            │  │
│  └──────────────────────────┬───────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ WebSocket Connection
                              │ (Socket.io Protocol)
┌─────────────────────────────▼───────────────────────────────┐
│                         Server Side                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            server.js (Express + Socket.io)           │  │
│  └──────┬────────────────────────────────────┬──────────┘  │
│         │                                    │              │
│  ┌──────▼───────────┐              ┌────────▼──────────┐   │
│  │   rooms.js       │              │ drawing-state.js  │   │
│  │ (User Manager)   │              │ (State Manager)   │   │
│  └──────────────────┘              └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Initial Connection

```
Client connects → Server assigns color → Server sends init_state
                                      → Contains: operations[], users[]
Client receives → Canvas redraws from operations
               → User list updates
```

### 2. Drawing Flow

```
User draws on canvas:
1. mousedown → start_stroke → Server broadcasts → remote_stroke_start
2. mousemove → draw_point   → Server broadcasts → remote_draw_point
3. mouseup   → end_stroke   → Server adds to operations → remote_stroke_end

Local canvas: Updates immediately (optimistic rendering)
Remote canvas: Updates as events arrive (with slight latency)
```

### 3. Undo/Redo Flow

```
User clicks undo:
1. Client sends 'undo' message
2. Server pops last operation from stack
3. Server pushes to redo stack
4. Server broadcasts new operations[] to ALL clients
5. All clients redraw canvas from operations[]

Same process for redo, but in reverse.
```

## WebSocket Message Protocol

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `start_stroke` | `{ x, y, color, width, tool }` | User begins drawing |
| `draw_point` | `{ x, y, color, width, tool }` | User continues stroke |
| `end_stroke` | `{ stroke: [...points] }` | User completes stroke |
| `cursor_move` | `{ x, y }` | User moves cursor |
| `undo` | none | User requests undo |
| `redo` | none | User requests redo |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `init_state` | `{ operations[], users[] }` | Initial state on connect |
| `remote_stroke_start` | `{ userId, point }` | Another user started drawing |
| `remote_draw_point` | `{ userId, point }` | Another user drawing |
| `remote_stroke_end` | `{ id, stroke, userId }` | Another user finished stroke |
| `remote_cursor_move` | `{ userId, position, color }` | Another user's cursor moved |
| `remote_undo` | `{ operations[] }` | Global undo occurred |
| `remote_redo` | `{ operations[] }` | Global redo occurred |
| `user_list` | `{ users[] }` | Updated user list |
| `user_joined` | `{ userId, color }` | New user connected |
| `user_left` | `{ userId }` | User disconnected |

## Core Components

### Client Side

#### 1. CanvasManager (canvas.js)

**Responsibilities:**
- Canvas rendering and drawing operations
- Local stroke state management
- Operations history (for undo/redo)
- Remote cursor visualization
- Mouse/touch event handling

**Key Methods:**
- `drawLine(from, to)` - Draws a line segment
- `drawStroke(stroke)` - Draws complete stroke
- `addOperation(operation)` - Adds to operations history
- `undoOperation()` - Removes last operation
- `redoOperation()` - Restores undone operation
- `redrawCanvas()` - Clears and redraws from operations[]
- `updateRemoteCursor()` - Shows other users' cursors

**State:**
- `operations[]` - Array of completed drawing operations
- `redoStack[]` - Array of undone operations
- `remoteCursors` - Map of userId → cursor data
- `currentStroke[]` - Points in active stroke

#### 2. WebSocketManager (websocket.js)

**Responsibilities:**
- Socket.io connection management
- Event emission and handling
- Callback registration

**Design Pattern:** Event-driven with callback registration
- Exposes `onEventName` properties for callback registration
- Thin wrapper around Socket.io for cleaner separation

#### 3. CollaborativeCanvas (main.js)

**Responsibilities:**
- Application coordination
- UI event handling
- Connecting CanvasManager with WebSocketManager
- User list updates

**Flow:**
```
UI Events → CanvasManager → WebSocketManager → Server
Server → WebSocketManager → CanvasManager → Canvas Update
```

### Server Side

#### 1. Server (server.js)

**Responsibilities:**
- Express HTTP server for static files
- Socket.io WebSocket server
- Event routing and broadcasting
- User color assignment

**Broadcasting Strategy:**
- `socket.broadcast.emit()` - Send to all except sender
- `io.emit()` - Send to all clients including sender
- Used strategically to avoid echo effects

#### 2. RoomManager (rooms.js)

**Responsibilities:**
- Track connected users
- Assign and store user colors
- Provide user list

**State:**
- `users` - Map of userId → user data
  - `id` - Socket ID
  - `color` - Assigned color
  - `joinedAt` - Timestamp

#### 3. DrawingState (drawing-state.js)

**Responsibilities:**
- Maintain global operation history
- Handle undo/redo logic
- Generate operation IDs

**State:**
- `operations[]` - All completed strokes
- `redoStack[]` - Undone operations
- `operationIdCounter` - Incrementing ID

**Operation Structure:**
```javascript
{
  id: number,           // Unique operation ID
  stroke: [...points],  // Array of {x, y, color, width, tool}
  userId: string,       // Who drew it
  timestamp: number     // When it was drawn
}
```

## Global Undo/Redo Implementation

### Why Global?

In a collaborative environment, undo/redo must be global because:
1. Multiple users contribute to the same canvas
2. Local undo would be confusing (which strokes to undo?)
3. Maintains consistent state across all clients

### How It Works

1. **Server maintains single source of truth**: `operations[]` array
2. **Undo operation:**
   - Server pops last item from `operations[]`
   - Pushes to `redoStack[]`
   - Broadcasts entire new `operations[]` to all clients
3. **Redo operation:**
   - Server pops from `redoStack[]`
   - Pushes back to `operations[]`
   - Broadcasts entire new `operations[]`
4. **Clients receive update:**
   - Replace local operations
   - Clear canvas
   - Redraw all operations in order

### Trade-offs

**Pros:**
- Simple to implement
- Guaranteed consistency
- No conflict resolution needed

**Cons:**
- Full canvas redraw on every undo/redo
- No per-user undo history
- Last-in-first-out only (can't selectively undo middle operations)

## Stroke Broadcasting and Reconstruction

### Three-Phase Stroke Protocol

**Why three phases?**
- Provides immediate feedback locally
- Minimizes bandwidth (incremental points vs. full stroke)
- Allows for smooth interpolation

**Phase 1: start_stroke**
- Client begins stroke
- Sends first point
- Initializes remote stroke buffer

**Phase 2: draw_point** (repeated)
- Client sends each new point
- Throttling optional (not implemented)
- Remote clients draw line from previous point

**Phase 3: end_stroke**
- Client completes stroke
- Sends full stroke array
- Server adds to operations
- Remote clients finalize and add to their operations

### Conflict Resolution

**Current Strategy: Last-Write-Wins**

Since strokes don't modify existing pixels (except eraser), conflicts are minimal:
- Strokes are independent operations
- Order matters only for overlapping pixels
- Visual conflicts (crossing lines) are acceptable

**Future Improvements:**
- Operational Transformation (OT)
- Conflict-free Replicated Data Types (CRDTs)
- Layer-based drawing

## Performance Optimizations

### 1. Cursor Movement Throttling

```javascript
// In main.js
this.cursorMoveThrottle = setTimeout(() => {
    this.wsManager.emitCursorMove(position);
}, 50);
```

**Why:** Cursor events fire very frequently (100+ times/second)
**Solution:** Throttle to max 20 updates/second (50ms)
**Impact:** Reduces bandwidth by 80-90%

### 2. Incremental Drawing

Instead of redrawing entire canvas on every point:
- Draw only new line segment
- Only full redraw on undo/redo or reconnect

### 3. Stroke Batching

Could be added:
- Batch multiple points into single message
- Send every N points or every N milliseconds
- Trade-off: latency vs. bandwidth

### 4. Canvas Optimization

- Use `lineCap: 'round'` and `lineJoin: 'round'` for smooth curves
- Path interpolation could be added for smoother lines
- Offscreen canvas for complex operations

## Canvas Redraw Strategy

### When to Redraw

1. **Window Resize** - Canvas dimensions change
2. **Undo/Redo** - Operations list changes
3. **Initial Load** - Receiving init_state
4. **Reconnect** - Re-sync with server

### Redraw Process

```javascript
redrawCanvas() {
    // 1. Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 2. White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 3. Draw each operation in order
    for (const operation of operations) {
        drawStroke(operation.stroke);
    }
}
```

### Optimization: Dirty Rectangles

Not currently implemented, but could add:
- Track which regions changed
- Only redraw affected rectangles
- Significant performance boost for large canvases

## State Synchronization

### New User Join

```
1. User connects
2. Server sends init_state with:
   - Full operations[] history
   - Current users[] list
3. Client reconstructs canvas
4. User sees current drawing state
```

### Reconnection Handling

Socket.io handles reconnection automatically:
- Client receives new socket ID
- Server treats as new connection
- Sends full state again
- Canvas rebuilds

### State Consistency

Guaranteed by:
1. Server is single source of truth
2. All operations go through server
3. Clients never modify operations locally (except optimistic rendering)
4. Periodic state sync could be added

## Security Considerations

**Current State: Minimal Security**

This is a proof-of-concept with no authentication or authorization.

**Vulnerabilities:**
- No rate limiting (DoS risk)
- No message validation (malformed data could crash server)
- No authentication (anyone can connect)
- No data sanitization

**Production Requirements:**
- Input validation on all messages
- Rate limiting (per IP, per user)
- Authentication (JWT, OAuth)
- Message size limits
- Sanitize user inputs
- HTTPS/WSS in production

## Scalability Considerations

### Current Limitations

- In-memory state (not scalable)
- Single server (no horizontal scaling)
- No persistence (data loss on restart)

### Scaling Strategy

**For Production:**

1. **Add MongoDB/Database:**
   - Persist operations
   - Store user sessions
   - Enable recovery

2. **Add Redis:**
   - Pub/Sub for multi-server
   - Session storage
   - Caching

3. **Horizontal Scaling:**
   - Multiple Node.js instances
   - Socket.io Redis adapter
   - Load balancer (sticky sessions)

4. **Room-based Architecture:**
   - Separate canvases/rooms
   - Users join specific rooms
   - Reduces broadcast load

## Testing Strategy

### Manual Testing

1. Open multiple tabs
2. Draw in each
3. Test undo/redo globally
4. Disconnect/reconnect
5. Test different tools

### Automated Testing (Not Implemented)

**Unit Tests:**
- DrawingState operations
- RoomManager user tracking
- Canvas coordinate calculations

**Integration Tests:**
- WebSocket message flow
- State synchronization
- Multi-client scenarios

**Load Tests:**
- Many simultaneous users
- Rapid draw operations
- Stress test undo/redo

## Future Enhancements

### Short Term
- Add MongoDB persistence
- Implement rooms/sessions
- Export to PNG/JPG
- Add more tools (shapes, text)

### Medium Term
- User authentication
- Private/public rooms
- Drawing layers
- Zoom and pan

### Long Term
- Operational Transformation for true conflict resolution
- Vector-based drawing (SVG)
- Replay/playback of drawing sessions
- Collaborative permissions and roles

## Conclusion

This architecture provides a solid foundation for a collaborative drawing application. The modular design allows for easy enhancement and scaling. Key strengths are simplicity, real-time synchronization, and clean separation of concerns.
