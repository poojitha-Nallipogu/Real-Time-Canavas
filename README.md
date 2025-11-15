# Collaborative Canvas

A real-time collaborative drawing application built with vanilla JavaScript, HTML5 Canvas, Node.js, Express, and Socket.io.

## Features

- **Freehand Drawing**: Draw smooth lines with customizable colors and stroke widths
- **Eraser Tool**: Erase parts of your drawing
- **Real-time Synchronization**: See other users' drawings in real-time
- **Live Cursors**: See where other users are drawing with colored cursor indicators
- **Global Undo/Redo**: Undo and redo operations that work across all connected users
- **User List**: See all online users with their assigned colors
- **Multi-user Support**: Multiple users can draw simultaneously without conflicts
- **Automatic State Sync**: New users receive the full canvas state when they join
- **Touch Support**: Works on mobile devices with touch events

## Tech Stack

### Frontend
- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas API
- CSS3
- Socket.io client

### Backend
- Node.js
- Express.js
- Socket.io server
- In-memory state management

## Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML page
│   ├── style.css           # Styling
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client management
│   └── main.js             # Application entry point
├── server/
│   ├── server.js           # Express + Socket.io server
│   ├── rooms.js            # User/room management
│   └── drawing-state.js    # Drawing operations state
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## Setup Instructions

### Prerequisites
- Node.js 14.0.0 or higher
- npm or yarn

### Installation

1. Clone or download the repository

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Testing with Multiple Users

To test the collaborative features:

1. Open the application in multiple browser tabs or windows
2. Start drawing in one tab and observe real-time updates in others
3. Try using different tools (brush, eraser) in different tabs
4. Test the undo/redo functionality - it should affect all users
5. Move your cursor around to see the cursor sharing feature

You can also test across different devices on the same network by accessing the server's IP address.

## How to Use

1. **Drawing**: Click and drag on the canvas to draw
2. **Change Color**: Use the color picker in the sidebar
3. **Adjust Stroke Width**: Use the slider to change brush/eraser size
4. **Switch Tools**: Click "Brush" or "Eraser" buttons
5. **Undo/Redo**: Click the respective buttons to undo or redo operations globally
6. **View Users**: See the list of online users in the sidebar

## Known Limitations and Bugs

1. **No Persistence**: Drawing state is stored in memory only. Server restart clears all drawings.
2. **Single Room**: All users connect to the same global canvas. No separate rooms implemented.
3. **No Authentication**: Users are anonymous and identified only by socket ID.
4. **Network Latency**: Very fast drawing may show slight delays on remote users' screens.
5. **No Export**: Cannot save or export drawings as images (could be added with canvas.toDataURL()).
6. **Mobile Optimization**: While touch events work, the UI is optimized for desktop.
7. **Cursor Performance**: With many users (10+), cursor rendering may become choppy.

## Potential Improvements

- Add MongoDB for persistent storage of drawings
- Implement multiple rooms/sessions
- Add user authentication and profiles
- Export canvas as PNG/JPG
- Add more drawing tools (shapes, text, fill bucket)
- Implement drawing layers
- Add zoom and pan functionality
- Optimize for mobile UI
- Add chat functionality
- Implement drawing permissions and roles

## Deployment

### Backend Deployment (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Deploy

### Frontend Deployment (Vercel/Netlify)

Since the frontend is served by the Express server, you don't need separate frontend deployment. Just deploy the entire application to Render or similar Node.js hosting.

Alternatively, for separate deployment:

1. Update `client/websocket.js` to point to your backend URL:
```javascript
const serverUrl = 'https://your-backend-url.com';
```

2. Deploy the `client` folder to Vercel/Netlify as a static site

3. Configure CORS on the backend to allow your frontend domain

## Time Spent

Approximately 4-5 hours were spent building this project, including:
- Architecture design and planning: 45 minutes
- Frontend canvas implementation: 1.5 hours
- WebSocket integration: 1 hour
- Backend server and state management: 1 hour
- Testing and debugging: 45 minutes
- Documentation: 30 minutes

## License

MIT
