class RoomManager {
    constructor() {
        this.users = new Map();
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

    getUser(userId) {
        return this.users.get(userId);
    }

    getUsers() {
        return Array.from(this.users.values());
    }

    getUserCount() {
        return this.users.size;
    }

    clear() {
        this.users.clear();
    }
}

module.exports = { RoomManager };
