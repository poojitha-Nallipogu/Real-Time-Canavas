# Quick Start Guide

Get the collaborative canvas running in under 2 minutes!

## Installation

```bash
npm install
```

## Run

```bash
npm start
```

Server will start on `http://localhost:3000`

## Test Collaboration

1. Open `http://localhost:3000` in **3 different browser tabs or windows**

2. In **Tab 1**:
   - Select a color (e.g., red)
   - Draw a circle

3. In **Tab 2**:
   - You should see the red circle appear in real-time
   - Select a different color (e.g., blue)
   - Draw a square

4. In **Tab 3**:
   - You should see both the circle and square
   - Select another color (e.g., green)
   - Draw a line

5. **Test Real-Time Sync**: Draw in any tab and watch it appear in the others instantly

6. **Test Cursor Sharing**: Move your cursor around in one tab, watch for colored dots in the other tabs

7. **Test Undo**: In any tab, click the "Undo" button. The most recent stroke should disappear in ALL tabs

8. **Test User List**: Look at the "Online Users" section in the sidebar. You should see 3 users listed with different colors

## Features to Try

### Drawing Tools
- Click the **color picker** to change colors
- Drag the **stroke width slider** to make lines thicker/thinner
- Click **"Eraser"** to switch to eraser mode
- Click **"Brush"** to switch back to drawing

### Collaboration Features
- Draw in multiple tabs simultaneously
- Move cursor around to see cursor sharing
- Click **"Undo"** to remove last stroke (affects all users)
- Click **"Redo"** to restore last undone stroke

### User Management
- Open more tabs to see user count increase
- Close tabs to see user count decrease
- Each user has a unique color indicator

## Testing on Multiple Devices

1. Find your computer's IP address:
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet "

   # On Windows:
   ipconfig
   ```

2. On another device (phone, tablet, another computer) on the same network, open:
   ```
   http://YOUR-IP-ADDRESS:3000
   ```

3. Draw on one device and watch it appear on the other!

## Project Structure

```
collaborative-canvas/
├── client/              # Frontend (HTML, CSS, JS)
│   ├── index.html      # Main page
│   ├── style.css       # Styling
│   ├── canvas.js       # Drawing logic
│   ├── websocket.js    # WebSocket client
│   └── main.js         # App controller
├── server/              # Backend (Node.js)
│   ├── server.js       # Main server
│   ├── rooms.js        # User management
│   └── drawing-state.js # Drawing operations
└── package.json         # Dependencies
```

## Documentation Files

- **README.md** - Full user guide and features
- **ARCHITECTURE.md** - Technical architecture details
- **FEATURES.md** - Complete feature list
- **PROJECT-SUMMARY.md** - Comprehensive overview
- **COMPLETE-CODE-EXPLANATION.md** - Code walkthrough
- **.deployment-guide.md** - Deployment instructions
- **QUICK-START.md** - This file!

## Common Issues

### Port Already in Use
If you see `Error: listen EADDRINUSE`:
```bash
# Change port in server/server.js or set PORT env var
PORT=3001 npm start
```

### Can't See Other Users' Drawings
- Make sure all tabs are open to the same URL
- Check browser console for errors (F12)
- Verify server is running

### Cursor Not Showing
- Cursors only appear for OTHER users, not yourself
- Move cursor in one tab, look at another tab

### Drawing Disappears on Refresh
- Normal behavior (in-memory only, no persistence)
- To add persistence, you'd need to add a database

## Next Steps

1. **Read** `README.md` for complete feature documentation
2. **Read** `ARCHITECTURE.md` to understand how it works
3. **Read** `.deployment-guide.md` to deploy to production
4. **Modify** the code to add your own features!

## Quick Commands

```bash
# Install dependencies
npm install

# Start server
npm start

# Start server on different port
PORT=3001 npm start
```

## Tips

- Open DevTools (F12) to see WebSocket messages
- Check server console to see connection logs
- Try drawing very fast to see real-time sync
- Test with 5+ tabs to see performance
- Use throttled network in DevTools to simulate slow connections

## Demo Scenario

**Perfect Demo for Showing Off:**

1. Open 2 browser windows side-by-side
2. In Window 1: Draw a red house
3. In Window 2: Watch it appear, then draw a blue tree
4. In Window 1: See the tree appear, draw a yellow sun
5. In Window 2: Click undo - sun disappears from both!
6. Move cursor around - see colored dots showing cursor position

This demonstrates:
- ✅ Real-time drawing sync
- ✅ Multi-user collaboration
- ✅ Cursor sharing
- ✅ Global undo/redo
- ✅ Color customization
- ✅ User management

## Performance Testing

To test performance with many users:
1. Open 10+ browser tabs
2. Draw rapidly in several tabs simultaneously
3. Watch CPU/memory usage
4. Test undo/redo with many strokes
5. Monitor network traffic in DevTools

## Code Exploration

Start by reading these files in order:
1. `client/index.html` - See the UI structure
2. `client/main.js` - See how everything connects
3. `client/canvas.js` - See the drawing logic
4. `server/server.js` - See the WebSocket handling

## Customization Ideas

Easy modifications to try:
- Change color palette (server.js: `generateRandomColor()`)
- Add keyboard shortcuts (main.js: add keydown listeners)
- Change canvas size (style.css: `.canvas-container`)
- Add more tools (canvas.js: add to `currentTool`)
- Change stroke width range (index.html: stroke-width slider)

## Deployment

Ready to deploy? See `.deployment-guide.md` for:
- Deploy to Render (free hosting)
- Deploy to Railway
- Deploy to Vercel/Netlify
- Custom domain setup
- Production considerations

## Support

- Check browser console for errors
- Check server terminal for logs
- Read documentation files for details
- Verify network connectivity

## Enjoy!

You now have a fully functional collaborative drawing app. Happy drawing!
