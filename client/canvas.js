export class CanvasManager {
    constructor(canvasElement, cursorCanvasElement) {
        this.canvas = canvasElement;
        this.cursorCanvas = cursorCanvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.cursorCtx = this.cursorCanvas.getContext('2d');

        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentWidth = 3;
        this.currentStroke = [];

        this.operations = [];
        this.redoStack = [];

        this.remoteCursors = new Map();

        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.cursorCanvas.width = rect.width;
            this.cursorCanvas.height = rect.height;
            this.redrawCanvas();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

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

    handleMouseMove(e) {
        const point = this.getMousePos(e);

        if (this.onCursorMove) {
            this.onCursorMove(point);
        }

        if (!this.isDrawing) return;

        const newPoint = {
            x: point.x,
            y: point.y,
            color: this.currentColor,
            width: this.currentWidth,
            tool: this.currentTool
        };

        this.currentStroke.push(newPoint);
        this.drawLine(
            this.currentStroke[this.currentStroke.length - 2],
            newPoint
        );

        if (this.onDrawPoint) {
            this.onDrawPoint(newPoint);
        }
    }

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

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseDown(touch);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove(touch);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    drawLine(from, to) {
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.strokeStyle = to.tool === 'eraser' ? '#FFFFFF' : to.color;
        this.ctx.lineWidth = to.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
    }

    drawStroke(stroke) {
        if (stroke.length < 2) return;

        for (let i = 1; i < stroke.length; i++) {
            this.drawLine(stroke[i - 1], stroke[i]);
        }
    }

    addOperation(operation) {
        this.operations.push(operation);
        this.redoStack = [];
    }

    undoOperation() {
        if (this.operations.length === 0) return null;

        const operation = this.operations.pop();
        this.redoStack.push(operation);
        this.redrawCanvas();

        return operation;
    }

    redoOperation() {
        if (this.redoStack.length === 0) return null;

        const operation = this.redoStack.pop();
        this.operations.push(operation);
        this.drawStroke(operation.stroke);

        return operation;
    }

    setOperations(operations) {
        this.operations = operations;
        this.redoStack = [];
        this.redrawCanvas();
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const operation of this.operations) {
            this.drawStroke(operation.stroke);
        }
    }

    updateRemoteCursor(userId, position, color) {
        this.remoteCursors.set(userId, { position, color });
        this.drawCursors();
    }

    removeRemoteCursor(userId) {
        this.remoteCursors.delete(userId);
        this.drawCursors();
    }

    drawCursors() {
        this.cursorCtx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);

        for (const [userId, data] of this.remoteCursors) {
            const { position, color } = data;

            this.cursorCtx.beginPath();
            this.cursorCtx.arc(position.x, position.y, 5, 0, 2 * Math.PI);
            this.cursorCtx.fillStyle = color;
            this.cursorCtx.fill();

            this.cursorCtx.strokeStyle = 'white';
            this.cursorCtx.lineWidth = 2;
            this.cursorCtx.stroke();
        }
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    setColor(color) {
        this.currentColor = color;
    }

    setWidth(width) {
        this.currentWidth = width;
    }

    clear() {
        this.operations = [];
        this.redoStack = [];
        this.redrawCanvas();
    }
}
