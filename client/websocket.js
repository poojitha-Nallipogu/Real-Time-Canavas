export class WebSocketManager {
    constructor(serverUrl) {
        this.socket = io(serverUrl);
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            if (this.onConnect) {
                this.onConnect();
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            if (this.onDisconnect) {
                this.onDisconnect();
            }
        });

        this.socket.on('init_state', (data) => {
            if (this.onInitState) {
                this.onInitState(data);
            }
        });

        this.socket.on('remote_stroke_start', (data) => {
            if (this.onRemoteStrokeStart) {
                this.onRemoteStrokeStart(data);
            }
        });

        this.socket.on('remote_draw_point', (data) => {
            if (this.onRemoteDrawPoint) {
                this.onRemoteDrawPoint(data);
            }
        });

        this.socket.on('remote_stroke_end', (data) => {
            if (this.onRemoteStrokeEnd) {
                this.onRemoteStrokeEnd(data);
            }
        });

        this.socket.on('remote_cursor_move', (data) => {
            if (this.onRemoteCursorMove) {
                this.onRemoteCursorMove(data);
            }
        });

        this.socket.on('remote_undo', (data) => {
            if (this.onRemoteUndo) {
                this.onRemoteUndo(data);
            }
        });

        this.socket.on('remote_redo', (data) => {
            if (this.onRemoteRedo) {
                this.onRemoteRedo(data);
            }
        });

        this.socket.on('user_list', (data) => {
            if (this.onUserList) {
                this.onUserList(data);
            }
        });

        this.socket.on('user_joined', (data) => {
            if (this.onUserJoined) {
                this.onUserJoined(data);
            }
        });

        this.socket.on('user_left', (data) => {
            if (this.onUserLeft) {
                this.onUserLeft(data);
            }
        });
    }

    emitStrokeStart(point) {
        this.socket.emit('start_stroke', point);
    }

    emitDrawPoint(point) {
        this.socket.emit('draw_point', point);
    }

    emitStrokeEnd(stroke) {
        this.socket.emit('end_stroke', { stroke });
    }

    emitCursorMove(position) {
        this.socket.emit('cursor_move', position);
    }

    emitUndo() {
        this.socket.emit('undo');
    }

    emitRedo() {
        this.socket.emit('redo');
    }
}
