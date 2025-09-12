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

        this.jumpsRemaining = 0; // Will be set when grounded
        this.maxJumps = 2;// Allow for a double jump
        this.jumpsRemaining = this.maxJumps;
        // this.timeOfLastJump = 0; // Optional: if you need a cooldown between jumps
        // this.jumpCooldown = 200; // Optional: 200ms cooldown
    }
    performJump(jumpStrengthOverride) {
        // This is the actual mechanics of jumping
        this.velocityY = -(jumpStrengthOverride || this.jumpStrength);
        this.isGrounded = false; // Player is no longer grounded
        this.jumpsRemaining--;
        // this.timeOfLastJump = performance.now(); // Optional for cooldown
        // Play jump sound, trigger jump animation etc.
        this.setAnimation('your_player_jump_animation'); // Or handled in main update
        console.log(`Jump performed! Jumps remaining: ${this.jumpsRemaining}`);
    }
    // This new method will be called from the Player's update method
    handleInput() {
        // Horizontal Movement Input
        this.dXInput = 0; // Reset for this frame
        if (input.isActionActive('moveLeft')) {
            this.dXInput -= 1;
        }
        if (input.isActionActive('moveRight')) {
            this.dXInput += 1;
        }
        // Ensure dXInput is capped at -1 or 1 if necessary,
        // e.g. if (this.dXInput < -1) this.dXInput = -1;
        //      if (this.dXInput > 1) this.dXInput = 1;


        // Update facing direction based on input
        if (this.dXInput > 0) {
            this.facingDirection = 1;
        } else if (this.dXInput < 0) {
            this.facingDirection = -1;
        }

        // Jump Input
        // Use isActionJustPressed for single-trigger actions like jump

        const jumpPressed = input.isActionJustPressed('jump'); // Store it for logging
        if (jumpPressed) {
            console.log("[Player DEBUG] 'jump' IS just pressed! isGrounded:", this.isGrounded, "jumpsRemaining:", this.jumpsRemaining);
            // ... your existing jump logic ...
            if (this.isGrounded) { // Or if (this.jumpsRemaining >0) for double jump
                this.performJump(); // Or this.jump()
            } else {
                console.log("[Player DEBUG] Jump pressed, but conditions not met (e.g., not grounded or no jumps left).");
            }
        }
    }

    update(deltaTime, currentTime, activeGameElements) {
        if (!this.isActive) return;
        // Store previous grounded state to detect landing
        const wasGrounded = this.isGrounded;
        // 1. Handle player-specific input
        this.handleInput(); // <<< CALL THE NEW METHOD HERE

        // 2. Apply physics (gravity) - Updates this.velocityY
        this.updatePhysics(deltaTime); // From Character.js


        // 3. Calculate horizontal displacement using the Player's dXInput property
        let dx = this.dXInput * this.speed * deltaTime;

        // 4. Calculate vertical movement based on current velocityY
        let dy = this.velocityY * deltaTime;



        // 5. Handle Tile Collision (updates this.x, this.y, and this.velocityY on impact)
        this.handleTileCollision(dx, dy); // From Character.js

        // 6. Check if Grounded (sets this.isGrounded and stabilizes velocityY if on ground)
        this.checkGrounded(); // From Character.js

        // 7. LANDING LOGIC: Reset jumps when player lands on the ground
        if (this.isGrounded && !wasGrounded) {
            this.jumpsRemaining = this.maxJumps;
            console.log(`[Player DEBUG] LANDED! Jumps reset to: ${this.jumpsRemaining}`);
        }
        // Coyote time / walked off ledge handling (Optional)
        else if (!this.isGrounded && wasGrounded && this.jumpsRemaining === this.maxJumps) {
            // Player just left the ground (walked off a ledge) without jumping
            // If you want walking off a ledge to count as "using" the ground jump:
            if (this.maxJumps > 0) { // Ensure there are jumps to "use"
                // this.jumpsRemaining = this.maxJumps -1; // Or just this.jumpsRemaining--;
                // console.log(`[Player DEBUG] WALKED OFF LEDGE. Jumps remaining: ${this.jumpsRemaining}`);
            }
            // If you want "coyote time", you'd have a small timer here allowing a jump.
        }

        // 8. Update Animations based on state
        // (This logic might also move into a separate updateAnimations method)
        if (!this.isGrounded && this.applyGravity) {
            if (this.velocityY < 0) {
                this.setAnimation('pickle_player_jump'); // Replace with actual animation names
            } else {
                this.setAnimation('pickle_player_fall');
            }
        } else {
            if (this.dXInput !== 0) {
                this.setAnimation('pickle_player_walk');
            } else {
                this.setAnimation('pickle_player_idle');
            }
        }
        // Ensure sprite flipping based on this.facingDirection is handled in your draw method or Sprite class

        // 9. Call Character's/Sprite's update for animation frame updates
        super.update(deltaTime, currentTime, activeGameElements);
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
    }



}
