// Character.js
import { Sprite } from './Sprite.js';
import { Logger } from './logger.js';
import * as globals from './globals.js';

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

export class Character extends Sprite {
    constructor(x, y, animationName, spriteScale, health, speed, tilemap, hitboxConfig = {}) {
        super(x, y, animationName, spriteScale);
        this.health = health;
        this.speed = speed;
        this.entityType = "character"; 
        this.tilemap = tilemap; // Assign tilemap early for use in jumpStrength calculation

        const defaultHitboxOffsetX = hitboxConfig.defaultOffsetX || 0;
        const defaultHitboxOffsetY = hitboxConfig.defaultOffsetY || 0;
        this.hitboxOffsetX = typeof hitboxConfig.offsetX === 'number' ? hitboxConfig.offsetX : defaultHitboxOffsetX;
        this.hitboxOffsetY = typeof hitboxConfig.offsetY === 'number' ? hitboxConfig.offsetY : defaultHitboxOffsetY;

        this.hitboxWidth = hitboxConfig.width || (this.width - (2 * this.hitboxOffsetX));
        this.hitboxHeight = hitboxConfig.height || (this.height - (2 * this.hitboxOffsetY));
        if (this.hitboxWidth < 0) { this.hitboxWidth = 0; }
        if (this.hitboxHeight < 0) { this.hitboxHeight = 0; }

        this.velocityY = 0;
        this.gravity = hitboxConfig.gravity || 980; // Default gravity

        // Calculate jumpStrength based on jumpHeightInTileQuarters if provided
        if (typeof hitboxConfig.jumpHeightInTileQuarters === 'number' && 
            this.tilemap && 
            typeof this.tilemap.tileSize === 'number' && 
            this.tilemap.tileSize > 0) {
            
            const desiredJumpHeightInTiles = hitboxConfig.jumpHeightInTileQuarters / 4;
            const desiredJumpHeightInPixels = desiredJumpHeightInTiles * this.tilemap.tileSize;
            
            if (desiredJumpHeightInPixels >= 0) {
                this.jumpStrength = Math.sqrt(2 * this.gravity * desiredJumpHeightInPixels);
            } else {
                this.jumpStrength = hitboxConfig.jumpStrength || 450; 
            }
        } else {
            this.jumpStrength = hitboxConfig.jumpStrength || 450; 
        }

        this.maxFallSpeed = hitboxConfig.maxFallSpeed || 700;
        this.isGrounded = false;
        this.applyGravity = typeof hitboxConfig.applyGravity === 'boolean' ? hitboxConfig.applyGravity : true;
    }

    getActualHitbox() {
        return { x: this.x + this.hitboxOffsetX, y: this.y + this.hitboxOffsetY, width: this.hitboxWidth, height: this.hitboxHeight };
    }

    updatePhysics(deltaTime) {
        if (!this.applyGravity) return;
        this.velocityY += this.gravity * deltaTime;
        this.velocityY = Math.min(this.velocityY, this.maxFallSpeed);
    }

    jump(customStrength) {
        if (this.isGrounded && this.applyGravity) {
            this.velocityY = -(customStrength || this.jumpStrength);
            this.isGrounded = false; 
        }
    }

    handleTileCollision(dx, dy) {
        if (!this.tilemap) {
            this.x += dx; this.y += dy; return;
        }
    
        // Horizontal Collision
        if (dx !== 0) {
            let proposedX = this.x + dx;
            let currentHitboxX = { x: proposedX + this.hitboxOffsetX, y: this.y + this.hitboxOffsetY, width: this.hitboxWidth, height: this.hitboxHeight };
            const tileMinCol = Math.floor(currentHitboxX.x / this.tilemap.tileSize);
            const tileMaxCol = Math.floor((currentHitboxX.x + currentHitboxX.width - 1) / this.tilemap.tileSize);
            const tileMinRow = Math.floor(currentHitboxX.y / this.tilemap.tileSize);
            const tileMaxRow = Math.floor((currentHitboxX.y + currentHitboxX.height - 1) / this.tilemap.tileSize);
            let collisionX = false;
            for (let c = tileMinCol; c <= tileMaxCol; c++) {
                for (let r = tileMinRow; r <= tileMaxRow; r++) {
                    if (this.tilemap.isTileSolid(c, r)) {
                        const tileRect = { x: c * this.tilemap.tileSize, y: r * this.tilemap.tileSize, width: this.tilemap.tileSize, height: this.tilemap.tileSize };
                        if (checkCollision(currentHitboxX, tileRect)) {
                            collisionX = true;
                            if (dx > 0) { this.x = tileRect.x - this.hitboxOffsetX - this.hitboxWidth; }
                            else { this.x = tileRect.x + this.tilemap.tileSize - this.hitboxOffsetX; }
                            break;
                        }
                    }
                }
                if (collisionX) break;
            }
            if (!collisionX) { this.x = proposedX; }
        }
    
        // Vertical Collision
        if (dy !== 0) {
            let proposedY = this.y + dy;
            let currentHitboxY = { x: this.x + this.hitboxOffsetX, y: proposedY + this.hitboxOffsetY, width: this.hitboxWidth, height: this.hitboxHeight };
            const tileMinCol = Math.floor(currentHitboxY.x / this.tilemap.tileSize);
            const tileMaxCol = Math.floor((currentHitboxY.x + currentHitboxY.width - 1) / this.tilemap.tileSize);
            const tileMinRow = Math.floor(currentHitboxY.y / this.tilemap.tileSize);
            const tileMaxRow = Math.floor((currentHitboxY.y + currentHitboxY.height - 1) / this.tilemap.tileSize);
            let collisionY = false;
            for (let c = tileMinCol; c <= tileMaxCol; c++) {
                for (let r = tileMinRow; r <= tileMaxRow; r++) {
                    if (this.tilemap.isTileSolid(c, r)) {
                        const tileRect = { x: c * this.tilemap.tileSize, y: r * this.tilemap.tileSize, width: this.tilemap.tileSize, height: this.tilemap.tileSize };
                        if (checkCollision(currentHitboxY, tileRect)) {
                            collisionY = true;
                            if (dy > 0) { 
                                this.y = tileRect.y - this.hitboxOffsetY - this.hitboxHeight + 0.1; 
                                this.velocityY = 0;
                            } else if (dy < 0) { 
                                this.y = tileRect.y + this.tilemap.tileSize - this.hitboxOffsetY;
                                this.velocityY = 0;
                            }
                            break;
                        }
                    }
                }
                if (collisionY) break;
            }
            if (!collisionY) {
                this.y = proposedY;
            } 
        }
    }

    checkGrounded() {
        if (!this.tilemap || !this.applyGravity) {
            this.isGrounded = !this.applyGravity;
            if (this.isGrounded) this.velocityY = 0; 
            return;
        }
    
        this.isGrounded = false;
        let groundSurfaceY = 0; 
    
        const probeOffsetY = this.hitboxOffsetY + this.hitboxHeight; // Relative to this.y
        const probeHitbox = {
            x: this.x + this.hitboxOffsetX,      // World X of the probe
            y: this.y + probeOffsetY,          // World Y of the probe
            width: this.hitboxWidth,
            height: 1 
        };
    
        const tileMinCol = Math.floor(probeHitbox.x / this.tilemap.tileSize);
        const tileMaxCol = Math.floor((probeHitbox.x + probeHitbox.width - 1) / this.tilemap.tileSize);
        const tileRow = Math.floor(probeHitbox.y / this.tilemap.tileSize); 
    
        for (let c = tileMinCol; c <= tileMaxCol; c++) {
            if (this.tilemap.isTileSolid(c, tileRow)) {
                const tileRect = { x: c * this.tilemap.tileSize, y: tileRow * this.tilemap.tileSize, width: this.tilemap.tileSize, height: this.tilemap.tileSize };
                if (probeHitbox.y >= tileRect.y && probeHitbox.y < tileRect.y + tileRect.height) {
                    this.isGrounded = true;
                    groundSurfaceY = tileRect.y; 
                    break; 
                }
            }
        }
    
        if (this.isGrounded) {
            this.y = groundSurfaceY - this.hitboxOffsetY - this.hitboxHeight + 0.1;
            this.velocityY = 0;
        }
    }

    update(deltaTime, currentTime, activeGameElements) {
        if (!this.isActive) return;
        super.update(deltaTime, currentTime, activeGameElements); 
    }

    draw(ctx, camera) { 
        if (!this.isActive) return;
        super.draw(ctx, camera);  // Calls Sprite.js draw, which now uses world coords

        if (globals.DEBUG_MODE && camera) { // camera can be passed for the conditional check
            const actualHitbox = this.getActualHitbox(); // World coordinates

            ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; 
            ctx.lineWidth = 1;
            // Draw hitbox at its world coordinates
            ctx.strokeRect(actualHitbox.x, actualHitbox.y, actualHitbox.width, actualHitbox.height);

            if (this.applyGravity) {
                ctx.fillStyle = this.isGrounded ? 'green' : 'blue';
                ctx.font = '10px Arial';
                // Position text relative to the hitbox's world coordinates
                const textX = actualHitbox.x; 
                const textY = actualHitbox.y - 5; // Slightly above the hitbox
                ctx.fillText(`G:${this.isGrounded} vY:${this.velocityY.toFixed(1)} H:${this.hitboxHeight.toFixed(0)} JS:${this.jumpStrength.toFixed(0)}`, textX, textY);
            }
            
            // For the ground probe, use its world coordinates
            const probeWorldX = actualHitbox.x; // Same X as hitbox
            const probeWorldY = actualHitbox.y + actualHitbox.height; // At the bottom of the hitbox

            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; 
            ctx.strokeRect(
                probeWorldX,
                probeWorldY,
                this.hitboxWidth,
                1 
            );
        }
    }
}
