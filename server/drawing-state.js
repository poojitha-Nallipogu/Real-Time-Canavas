class DrawingState {
    constructor() {
        this.operations = [];
        this.redoStack = [];
        this.operationIdCounter = 0;
    }

    addStroke(stroke, userId) {
        const operation = {
            id: this.operationIdCounter++,
            stroke: stroke,
            userId: userId,
            timestamp: Date.now()
        };

        this.operations.push(operation);
        this.redoStack = [];

        return operation;
    }

    undo() {
        if (this.operations.length === 0) {
            return false;
        }

        const operation = this.operations.pop();
        this.redoStack.push(operation);

        return true;
    }

    redo() {
        if (this.redoStack.length === 0) {
            return false;
        }

        const operation = this.redoStack.pop();
        this.operations.push(operation);

        return true;
    }

    getOperations() {
        return this.operations;
    }

    clear() {
        this.operations = [];
        this.redoStack = [];
        this.operationIdCounter = 0;
    }

    getOperationCount() {
        return this.operations.length;
    }

    getRedoCount() {
        return this.redoStack.length;
    }
}

module.exports = { DrawingState };
