// ./BackgroundManager.js
import { BACKGROUND_LAYER_DEFINITIONS } from './backgroundConfig.js';
import { Logger } from './logger.js'; // Assuming you have a Logger

export class BackgroundManager {
    constructor() {
        this.layers = []; // Will store processed layer objects
        this.assetManager = null;
    }

    loadLevelBackgrounds(levelData, assetManagerInstance) {
        this.layers = []; 
        this.assetManager = assetManagerInstance;

        if (!levelData || !levelData.backgroundLayers || !Array.isArray(levelData.backgroundLayers)) {
            Logger.info('[BackgroundManager] No backgroundLayers array in level data or it is not an array. No backgrounds will be drawn.');
            return;
        }

        if (!this.assetManager) {
            Logger.error('[BackgroundManager] AssetManager instance not provided. Cannot load background images.');
            return;
        }

        levelData.backgroundLayers.forEach(layerInfo => {
            const definition = BACKGROUND_LAYER_DEFINITIONS[layerInfo.id];
            if (!definition) {
                Logger.warn(`[BackgroundManager] No background definition found for ID: ${layerInfo.id}`);
                return;
            }

            const image = this.assetManager.getAsset(definition.assetKey);
            if (!image) {
                Logger.warn(`[BackgroundManager] Image not found in AssetManager for key: ${definition.assetKey} (for layer ID: ${layerInfo.id})`);
                return;
            }

            const processedLayer = {
                image: image,
                assetKey: definition.assetKey,
                scrollFactorX: layerInfo.scrollFactorX !== undefined ? layerInfo.scrollFactorX : definition.scrollFactorX,
                scrollFactorY: layerInfo.scrollFactorY !== undefined ? layerInfo.scrollFactorY : definition.scrollFactorY,
                repeatX: layerInfo.repeatX !== undefined ? layerInfo.repeatX : definition.repeatX,
                repeatY: layerInfo.repeatY !== undefined ? layerInfo.repeatY : definition.repeatY,
                yOffset: (layerInfo.yOffset !== undefined ? layerInfo.yOffset : definition.yOffset) || 0,
                zIndex: definition.zIndex !== undefined ? definition.zIndex : (this.layers.length),
                imgWidth: image.width,
                imgHeight: image.height
            };
            this.layers.push(processedLayer);
        });

        this.layers.sort((a, b) => a.zIndex - b.zIndex);
        Logger.info(`[BackgroundManager] Processed ${this.layers.length} background layers.`);
    }

    draw(ctx, camera, bufferAmount = 100, overlapAmount = 2) { 
        if (!camera) {
            Logger.warn('[BackgroundManager] Camera not available, cannot draw backgrounds.');
            return;
        }

        this.layers.forEach(layer => {
            if (!layer.image || layer.imgWidth === 0 || layer.imgHeight === 0) return;

            const camX = camera.x;
            const camY = camera.y;
            
            let layerBaseX = (camX * layer.scrollFactorX);
            let layerBaseY = (camY * layer.scrollFactorY) + layer.yOffset;

            ctx.save();

            let initialDrawOffsetX = 0;
            if (layer.repeatX) {
                initialDrawOffsetX = -(layerBaseX % layer.imgWidth);
                if (initialDrawOffsetX > 0) initialDrawOffsetX -= layer.imgWidth;
            } else {
                initialDrawOffsetX = -layerBaseX;
            }

            let initialDrawOffsetY = 0;
            if (layer.repeatY) {
                initialDrawOffsetY = -(layerBaseY % layer.imgHeight);
                if (initialDrawOffsetY > 0) initialDrawOffsetY -= layer.imgHeight;
            } else {
                initialDrawOffsetY = -layerBaseY;
            }
            
            let currentDrawX = initialDrawOffsetX;
            if (layer.repeatX) {
                // Adjust currentDrawX to be the first tile whose right edge is beyond -bufferAmount
                // This ensures we start drawing from the left buffer area if needed

               // while (currentDrawX + layer.imgWidth < -bufferAmount) {// caused off by one error ... literaly palm face
                while (currentDrawX + layer.imgWidth <= -bufferAmount - 0.001){
                    currentDrawX += layer.imgWidth;
                }
            }

            // Loop for drawing in X dimension
            // Continue as long as the tile's left edge is to the left of (camera.width + bufferAmount)
            while (currentDrawX < camera.width + bufferAmount) {
                // For non-repeating X, if this single draw is entirely to the left of the buffer, skip
                if (!layer.repeatX && (currentDrawX + layer.imgWidth <= -bufferAmount)) {
                    break; 
                }

                let currentDrawY = initialDrawOffsetY;
                if (layer.repeatY) {
                    // Adjust currentDrawY for the top buffer
                    while (currentDrawY + layer.imgHeight < -bufferAmount) {
                        currentDrawY += layer.imgHeight;
                    }
                }

                // Loop for drawing in Y dimension
                // Continue as long as the tile's top edge is above (camera.height + bufferAmount)
                while (currentDrawY < camera.height + bufferAmount) {
                    // For non-repeating Y, if this single draw is entirely above the buffer, skip
                    if (!layer.repeatY && (currentDrawY + layer.imgHeight <= -bufferAmount)) {
                        break;
                    }

                    // Determine draw width and height based on repetition and overlap
                    let drawWidth = layer.imgWidth;
                    let drawHeight = layer.imgHeight;

                    if (layer.repeatX && overlapAmount > 0) {
                        drawWidth += overlapAmount;
                    }
                    if (layer.repeatY && overlapAmount > 0) {
                        drawHeight += overlapAmount;
                    }

                    ctx.drawImage(layer.image, currentDrawX, currentDrawY, drawWidth, drawHeight);

                    if (!layer.repeatY) break; // If not repeating Y, draw once and exit Y loop
                    currentDrawY += layer.imgHeight;
                } // End Y loop

                if (!layer.repeatX) break; // If not repeating X, draw once and exit X loop
                currentDrawX += layer.imgWidth;
            } // End X loop
            
            ctx.restore();
        });
    }
}
