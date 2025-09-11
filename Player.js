import { Character } from './Character.js';
import * as input from './input.js';
import * as globals from './globals.js';
import { Logger } from './logger.js';

export class Player extends Character {
    constructor(x, y, animationName, spriteScale, health, speed, tilemap) {
        const playerHitboxConfig = {
            offsetX: 8,
            offsetY: 10,
            applyGravity: true,
            width: 50, 
            height: 86,
            jumpHeightInTileQuarters: 14 // NEW: Player's jump apex will be 1 tile high (4 * 1/4)
        };
        super(x, y, animationName, spriteScale, health, speed, tilemap, playerHitboxConfig);
        this.entityType = "player_pickle"; // Corrected from 'player' based on previous findings
        // ADD THIS LOG:
        Logger.trace(`[Player CONSTRUCTOR] Initial raw x: ${x}, y: ${y}`);
        Logger.trace(`[Player CONSTRUCTOR] this.x: ${this.x.toFixed(2)}, this.y: ${this.y.toFixed(2)}, this.velocityY: ${this.velocityY.toFixed(2)}`);
        Logger.trace(`[Player CONSTRUCTOR] Hitbox: offX=${this.hitboxOffsetX}, offY=${this.hitboxOffsetY}, w=${this.hitboxWidth}, h=${this.hitboxHeight}`);
        Logger.trace(`[Player CONSTRUCTOR] Calculated jumpStrength: ${this.jumpStrength ? this.jumpStrength.toFixed(2) : 'N/A (calculated in Character.js)'}`);

    }

    update(deltaTime, currentTime, activeGameElements) {
        if (!this.isActive) return;

        // ADD THESE LOGS AT THE START OF UPDATE:
        if (this.entityType === 'player_pickle' && typeof window.playerUpdateCount === 'undefined') window.playerUpdateCount = 0;
        if (this.entityType === 'player_pickle' && window.playerUpdateCount < 10) { // Log first 10 updates
            Logger.trace(`[Player UPDATE #${window.playerUpdateCount}] dt: ${deltaTime.toFixed(4)}, this.x: ${this.x.toFixed(2)}, this.y: ${this.y.toFixed(2)}, this.velocityY: ${this.velocityY.toFixed(2)}, this.isGrounded: ${this.isGrounded}`);
            window.playerUpdateCount++;
        }

        // 1. Apply physics (gravity) - Updates this.velocityY
        this.updatePhysics(deltaTime);

        // 2. Get Horizontal Input
        let dXInput = 0;
        if (input.isActionActive('moveLeft')) dXInput -= 1;
        if (input.isActionActive('moveRight')) dXInput += 1;
        let dx = dXInput * this.speed * deltaTime;

        // 3. Calculate vertical movement based on current velocityY
        let dy = this.velocityY * deltaTime;

        // 4. Handle Tile Collision (updates this.x, this.y, and this.velocityY on impact)
        this.handleTileCollision(dx, dy);

        // 5. Check if Grounded (sets this.isGrounded and stabilizes velocityY if on ground)
        this.checkGrounded();

        // 6. Handle Jump Input (uses the now definitive this.isGrounded)
        if (input.isActionActive('jump') && this.isGrounded && this.applyGravity) {
            this.jump(); 
        }
        
        // 7. Update Animations based on state (uses the latest isGrounded)
        if (!this.isGrounded && this.applyGravity) {
            if (this.velocityY < 0) {
                this.setAnimation('pickle_player_jump'); 
            } else {
                this.setAnimation('pickle_player_fall'); 
            }
        } else { 
            if (dXInput !== 0) {
                this.setAnimation('pickle_player_walk');
            } else {
                this.setAnimation('pickle_player_idle');
            }
        }
        
        if (dXInput > 0) this.facingDirection = 1;
        else if (dXInput < 0) this.facingDirection = -1;

        // 8. Call Character's update (handles animation frame updates from Sprite class)
        super.update(deltaTime, currentTime, activeGameElements);
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
    }
}
