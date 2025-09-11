export class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width; // Native width
        this.height = height; // Native height
        this.isActive = true; // For easy removal
        this.type = "game_object"; // Generic
    }

    update(deltaTime, currentTime, activeGameElements) {
        // Basic update logic, maybe nothing for the base class
    }

    draw(ctx) {
        // Basic draw logic, maybe nothing
    }
}