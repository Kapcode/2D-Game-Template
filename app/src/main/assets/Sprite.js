// Sprite.js
import { assetManager } from './AssetManager.js';
import { ANIMATIONS } from './globals.js';
import { GameObject } from './GameObject.js';

export class Sprite extends GameObject {
    constructor(x, y, initialAnimationName, spriteScale = 1.0) {
        super(x, y, 0, 0); 
        this.entityType = "sprite";
        this.spriteScale = spriteScale;
        this.facingDirection = 1;
        this.currentAnimationName = initialAnimationName;
        this.currentFrameIndex = 0;
        this.animationTimer = 0;
        this.speedModifier = 1;
        this.currentSpriteName = "";
        this.isAnimationLoaded = false;

        if (ANIMATIONS && assetManager.getSpriteData()) {
            this.updateCurrentSpriteAndDimensions();
            this.isAnimationLoaded = true;
        } else {
            console.warn(`[Sprite Constructor] ANIMATIONS or spriteData not ready for "${initialAnimationName}".`);
        }
    }

    ensureAnimationLoaded() {
        if (!this.isAnimationLoaded && ANIMATIONS && assetManager.getSpriteData()) {
            this.updateCurrentSpriteAndDimensions();
            this.isAnimationLoaded = true;
            console.log(`[Sprite ensureAnimationLoaded] Successfully loaded animation for: ${this.currentAnimationName}`);
        }
    }

    updateCurrentSpriteAndDimensions() {
        const animData = ANIMATIONS[this.currentAnimationName];
        const spriteSheetData = assetManager.getSpriteData();

        if (!animData || !animData.frames || animData.frames.length === 0) {
            console.warn(`[Sprite] Animation data not found or empty for: "${this.currentAnimationName}"`);
            this.currentSpriteName = "default_fallback_sprite";
            this.width = 32 * this.spriteScale;
            this.height = 32 * this.spriteScale;
            this.speedModifier = 1;
            return;
        }

        if (!spriteSheetData || !spriteSheetData.frames) {
            console.warn(`[Sprite] Sprite sheet data not available for "${this.currentAnimationName}".`);
            if (!this.currentSpriteName) this.currentSpriteName = "default_fallback_sprite";
            this.width = 32 * this.spriteScale;
            this.height = 32 * this.spriteScale;
            return;
        }

        const frameInfoFromAnim = animData.frames[this.currentFrameIndex];
        let frameSpriteName;

        if (typeof frameInfoFromAnim === 'string') {
            frameSpriteName = frameInfoFromAnim;
            this.speedModifier = animData.baseSpeedModifier || 1;
        } else if (typeof frameInfoFromAnim === 'object' && frameInfoFromAnim.name) {
            frameSpriteName = frameInfoFromAnim.name;
            this.speedModifier = frameInfoFromAnim.speedModifier !== undefined ? frameInfoFromAnim.speedModifier : (animData.baseSpeedModifier || 1);
        } else {
            console.warn(`[Sprite] Invalid frame info for "${this.currentAnimationName}" at index ${this.currentFrameIndex}:`, frameInfoFromAnim);
            this.currentSpriteName = "default_fallback_sprite";
            this.width = 32 * this.spriteScale;
            this.height = 32 * this.spriteScale;
            return;
        }

        this.currentSpriteName = frameSpriteName;
        const spriteFrameData = spriteSheetData.frames[this.currentSpriteName];

        if (spriteFrameData) {
            const frameDetails = spriteFrameData.frame;
            const sourceSize = spriteFrameData.sourceSize;
            if (sourceSize) {
                this.width = sourceSize.w * this.spriteScale;
                this.height = sourceSize.h * this.spriteScale;
            } else {
                this.width = frameDetails.w * this.spriteScale;
                this.height = frameDetails.h * this.spriteScale;
            }
        } else {
            console.warn(`[Sprite] Sprite data for frame name "${this.currentSpriteName}" not found.`);
            if (this.width === 0) this.width = 32 * this.spriteScale;
            if (this.height === 0) this.height = 32 * this.spriteScale;
        }
        this.isAnimationLoaded = true;
    }

    updateAnimation(deltaTime) {
        if (!this.isAnimationLoaded) {
            this.ensureAnimationLoaded();
            if (!this.isAnimationLoaded) return;
        }

        const animData = ANIMATIONS[this.currentAnimationName];
        if (!animData || !animData.frames || animData.frames.length === 0) return;

        let frameDuration;
        const currentFrameDetail = animData.frames[this.currentFrameIndex];

        if (typeof currentFrameDetail === 'object' && currentFrameDetail.duration) {
            frameDuration = currentFrameDetail.duration / 1000;
        } else if (animData.defaultAnimationSpeedFPS && animData.defaultAnimationSpeedFPS > 0) {
            frameDuration = 1 / animData.defaultAnimationSpeedFPS;
        } else {
            frameDuration = 0.1;
        }

        this.animationTimer += deltaTime;
        if (this.animationTimer >= frameDuration) {
            this.animationTimer -= frameDuration;
            if (this.currentFrameIndex + 1 >= animData.frames.length) {
                if (animData.loop) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex = animData.frames.length - 1;
                }
            } else {
                this.currentFrameIndex++;
            }
            this.updateCurrentSpriteAndDimensions();
        }
    }

    setAnimation(animationName) {
        if (this.currentAnimationName !== animationName && ANIMATIONS[animationName]) {
            this.currentAnimationName = animationName;
            this.currentFrameIndex = 0;
            this.animationTimer = 0;
            if (this.isAnimationLoaded) {
                this.updateCurrentSpriteAndDimensions();
            } else {
                this.ensureAnimationLoaded();
            }
        }
    }

    update(deltaTime, currentTime, activeGameElements) {
        super.update(deltaTime, currentTime, activeGameElements);
        this.updateAnimation(deltaTime);
    }

    draw(ctx, camera) { // camera parameter is kept for consistency, though not used for offsetting here
        super.draw(ctx, camera); 

        if (!this.isAnimationLoaded && this.isActive) {
            this.ensureAnimationLoaded();
        }

        // REMOVED: camX and camY calculations, as main.js handles camera via ctx.translate

        if (!this.currentSpriteName) {
            if (window.debugMode) {
                ctx.fillStyle = "magenta";
                // Draw at world coordinates; main.js's ctx.translate handles camera
                ctx.fillRect(this.x, this.y, 32, 32); 
                ctx.fillStyle = "white";
                ctx.fillText("NO_SPRITE", this.x, this.y + 10); 
            }
            return;
        }

        const drawOptions = {
            flipX: this.facingDirection === -1,
            spriteScale: this.spriteScale,
            debugDraw: window.debugMode === true
        };

        // Draw at world coordinates; main.js's ctx.translate handles camera
        assetManager.drawSprite(ctx, this.currentSpriteName, this.x, this.y, drawOptions);
    }
}
