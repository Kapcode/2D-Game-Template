import { Character } from './Character.js';
import * as globals from './globals.js';
import { Logger } from './logger.js'; 

export class EnemyPatrol extends Character {
    constructor(x, y, animationName, spriteScale, health, speed, patrolMinX, patrolMaxX, tilemap) {
        const enemyHitboxConfig = {
            applyGravity: true,
            // Example: if chef sprite needs specific offsets different from Character defaults
            // offsetX: 4, 
            // offsetY: 5,
            // width: desiredStaticWidth, // Set these if chef animations also cause hitbox size flicker
            // height: desiredStaticHeight
        };
        super(x, y, animationName, spriteScale, health, speed, tilemap, enemyHitboxConfig);
        
        this.entityType = "enemy_chef_ketchup_patrol";
        this.patrolDirectionX = 1; // 1 for right, -1 for left
        this.facingDirection = 1;
        this.initialAnimationName = animationName; // Store initial animation for patrol

        this.patrolMinX = patrolMinX;
        this.patrolMaxX = patrolMaxX;
    }

    update(deltaTime, currentTime, activeGameElementsRef) {
        if (!this.isActive) return;

        // 1. Apply physics (gravity) - Updates this.velocityY
        this.updatePhysics(deltaTime);

        // 2. Determine intended horizontal movement based on patrol logic
        let dx = 0;
        // Only allow horizontal patrol movement if applyGravity is off, OR if grounded and applyGravity is on.
        if (!this.applyGravity || (this.isGrounded && this.applyGravity)) {
             dx = this.patrolDirectionX * this.speed * deltaTime;
        }
       
        // 3. Calculate vertical movement based on current velocityY
        let dy = this.velocityY * deltaTime;

        const previousX = this.x; // Store X before collision for wall detection

        // 4. Handle Tile Collision (updates this.x, this.y, and this.velocityY on impact)
        this.handleTileCollision(dx, dy);

        // 5. Check if Grounded (sets this.isGrounded and stabilizes velocityY if on ground)
        this.checkGrounded();

        // 6. Patrol Logic: Adjust direction if boundaries or walls are hit
        // Only turn if patrolling horizontally (dx was potentially non-zero)
        if (dx !== 0) { // Check if it was attempting to move horizontally
            if (this.patrolDirectionX > 0) { // Moving right
                if ((this.x + this.hitboxOffsetX + this.hitboxWidth) >= this.patrolMaxX) {
                    //this.x = this.patrolMaxX - (this.hitboxOffsetX + this.hitboxWidth); // Clamp position
                    this.patrolDirectionX = -1;
                    this.facingDirection = -1;
                } else if (this.x <= previousX && this.isGrounded) { // Hit a wall (position didn't change or moved back)
                    this.patrolDirectionX = -1;
                    this.facingDirection = -1;
                }
            } else if (this.patrolDirectionX < 0) { // Moving left
                if ((this.x + this.hitboxOffsetX) <= this.patrolMinX) {
                    //this.x = this.patrolMinX - this.hitboxOffsetX; // Clamp position
                    this.patrolDirectionX = 1;
                    this.facingDirection = 1;
                } else if (this.x >= previousX && this.isGrounded) { // Hit a wall
                    this.patrolDirectionX = 1;
                    this.facingDirection = 1;
                }
            }
        }
        
        // 7. Update Animations based on state
        if (this.applyGravity && !this.isGrounded) {
            // this.setAnimation('chef_fall'); // IF you have a specific fall animation for chef
        } else {
            // this.setAnimation(this.initialAnimationName); // Back to patrol animation
        }
        // Base animation (e.g., walk cycle) is often handled by Sprite based on currentAnimationName
        // which we might not want to change every frame here unless state demands it (like falling).

        // 8. Call Character's update (handles animation frame updates from Sprite class)
        super.update(deltaTime, currentTime, activeGameElementsRef);
    }
}

export let eChef1 = null;

export function createPatrolingChef(x, y, animationName, spriteScale, health, speed, patrolMinX, patrolMaxX, tilemap) {
    eChef1 = new EnemyPatrol(
        x, y, 
        animationName, spriteScale, 
        health, speed, 
        patrolMinX, patrolMaxX, 
        tilemap
    );
    return eChef1;
}
