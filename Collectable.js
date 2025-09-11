// Collectable.js
import { Sprite } from './Sprite.js';
// import { assetManager } from './AssetManager.js'; // If you need to directly play sounds here

export class Collectable extends Sprite {
    constructor(x, y, type, spriteScale = 1.0) {
        // The 'type' (e.g., "coin") is used as the initialAnimationName for the Sprite.
        // Ensure an animation named "coin" (or whatever types you have) exists in your ANIMATIONS global.
        super(x, y, type, spriteScale);

        this.entityType = 'collectable'; // Override entityType from Sprite
        this.collectableType = type;     // Store the specific type (e.g., "coin")
        this.isCollected = false;

        // Depending on your GameObject and collision system, you might set these:
        // this.isSolid = false; // Collectables usually don't block movement
        // this.isTrigger = true; // To detect overlap without solid collision

        // Logger.log('Collectable created:', this.collectableType, this.x, this.y);
    }

    onCollect(collector) {
        if (!this.isCollected) {
            this.isCollected = true;
            this.isActive = false; // Make it inactive so it's no longer updated or drawn
            console.log(`[Collectable] ${this.collectableType} collected by ${collector ? collector.entityType : 'unknown'} at (${this.x}, ${this.y})`);
            
            // --- Placeholder for collection effects ---
            // Example: Play a sound
            // if (assetManager.sounds['coin_pickup']) { // Check if sound exists
            //     assetManager.playSound('coin_pickup');
            // }

            // Example: Add to score or inventory (this logic would typically reside in the collector or a game manager)
            // if (collector && typeof collector.addToScore === 'function') {
            //     collector.addToScore(this.collectableType === 'coin' ? 10 : 50); // Example points
            // }
        }
    }

    update(deltaTime, currentTime, activeGameElements) {
        if (!this.isActive || this.isCollected) {
            return; // Don't update if collected or set to inactive
        }

        // The parent Sprite class handles animation updates.
        super.update(deltaTime, currentTime, activeGameElements);

        // Add any unique collectable behavior here, e.g., bobbing up and down, if not handled by Sprite animations.
    }

    // The draw() method is inherited from Sprite and should work as is,
    // drawing the collectable based on its current animation frame.
    // It will not be drawn if this.isActive is false.
}
