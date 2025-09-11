// Camera.js
import { Logger } from './logger.js';
export class Camera {
    constructor(x, y, width, height, worldWidth, worldHeight) {
        this.x = x; // Camera's top-left position in the game WORLD
        this.y = y;
        this.width = width;   // Width of the camera's viewport (usually canvas width)
        this.height = height; // Height of the camera's viewport (usually canvas height)

        this.worldWidth = worldWidth;   // Total width of the game world/map
        this.worldHeight = worldHeight; // Total height of the game world/map

        this.target = null; // The object the camera will follow (e.g., the player)
        // deadZoneX is the margin from the edge of the viewport to the start of the dead zone.
        // The actual dead zone starts at camera.x + deadZoneX (in world space, for logic)
        // or at deadZoneX (in camera/native view space, for debug drawing).
        this.deadZoneX = width / 2.2; // Example: if width is 1280, deadZoneX is ~581. 
                                     // This results in a central dead zone width of width - 2*(width/2.2) approx 9% of viewport width.
        this.deadZoneY = height / 3; 

        this.damping = 0.15; 

        Logger.trace(`[Camera] Initialized. Viewport: ${width}x${height}, World: ${worldWidth}x${worldHeight}`);
        Logger.trace(`[Camera] DeadZoneX margin: ${this.deadZoneX.toFixed(2)}, DeadZoneY margin: ${this.deadZoneY.toFixed(2)}`);
    }

    follow(target) {
        this.target = target;
        Logger.trace("[Camera] Now following target:", this.target);
    }

    setWorldSize(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        Logger.trace(`[Camera] World size updated to: ${worldWidth}x${worldHeight}`);
        this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.height));
    }

    update() {
        if (!this.target) {
            return;
        }

        const playerCenterX = this.target.x + this.target.width / 2;
        const deadZoneLeftEdgeWorld = this.x + this.deadZoneX;
        const deadZoneRightEdgeWorld = this.x + this.width - this.deadZoneX;
        
        let targetCameraX = this.x; 

        if (playerCenterX < deadZoneLeftEdgeWorld) {
            targetCameraX = playerCenterX - this.deadZoneX;
        } else if (playerCenterX > deadZoneRightEdgeWorld) {
            targetCameraX = playerCenterX - (this.width - this.deadZoneX);
        }
        
        this.x += (targetCameraX - this.x) * this.damping;

        let idealY = this.target.y + (this.target.height / 2) - (this.height / 2);
        this.y += (idealY - this.y) * this.damping;

        if (this.worldWidth > 0) {
            if (this.width >= this.worldWidth) {
                this.x = (this.worldWidth - this.width) / 2;
            } else {
                this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.width));
            }
        } else {
            this.x = 0;
        }

        if (this.worldHeight > 0) {
            if (this.height >= this.worldHeight) {
                this.y = (this.worldHeight - this.height) / 2;
            } else {
                this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.height));
            }
        } else {
            this.y = 0;
        }
    }

    drawDeadZoneDebug(ctx, globalScale, globalOffsetX, globalOffsetY) {
        if (!ctx) {
            Logger.warn("[Camera.drawDeadZoneDebug] No canvas context provided.");
            return;
        }

        const deadZoneRectNativeX = this.deadZoneX;
        const deadZoneRectNativeY = this.deadZoneY;
        const deadZoneRectNativeWidth = this.width - (2 * this.deadZoneX);
        const deadZoneRectNativeHeight = this.height - (2 * this.deadZoneY);

        const deadZoneScreenX = globalOffsetX + (deadZoneRectNativeX * globalScale);
        const deadZoneScreenY = globalOffsetY + (deadZoneRectNativeY * globalScale);
        const deadZoneScreenWidth = deadZoneRectNativeWidth * globalScale;
        const deadZoneScreenHeight = deadZoneRectNativeHeight * globalScale;
        // REMOVED: console.log for deadZoneScreenX, deadZoneScreenY

        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Cyan color
        ctx.lineWidth = 2;
        ctx.strokeRect(deadZoneScreenX, deadZoneScreenY, deadZoneScreenWidth, deadZoneScreenHeight);

        ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.fillText('Camera Dead Zone', deadZoneScreenX + 5, deadZoneScreenY + 15);
    }
}
