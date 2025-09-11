// TilemapRenderer.js
import * as globals from './globals.js';
import { assetManager} from './AssetManager.js';
import { Logger } from './logger.js';
export class TilemapRenderer {
    constructor(levelTileData, tileConfig) {
        this.tileData = levelTileData; // The tilemap array from levelX.json (e.g., [[1,0,1], [2,2,0]])
        this.tileConfig = tileConfig;
        this.tileSize = this.tileConfig.TILE_SIZE;
        this.rows = this.tileData.length;
        this.cols = this.tileData[0] ? this.tileData[0].length : 0; // Get dimensions

        this.masterSpriteData = assetManager.getSpriteData(globals.MASTER_SPRITE_SHEET_KEY);
        this.masterSheet = assetManager.getSpriteSheetImage(globals.MASTER_SPRITE_SHEET_KEY);

        if (!this.masterSheet || !this.masterSpriteData) {
            Logger.error("TilemapRenderer: Master spritesheet or sprite data not found!");
        }
        Logger.trace(`[TilemapRenderer] Initialized for a ${this.cols}x${this.rows} map with tileSize ${this.tileSize}.`);
    }

    draw(ctx, camera, options = {}) { 
        // The camera parameter is still useful for culling (deciding which tiles to draw)
        // but not for offsetting draw coordinates if main loop handles ctx.translate.
        Logger.trace(`TilemapRenderer.draw: camera.x=${camera.x}, camera.y=${camera.y}, camera.width=${camera.width}, camera.height=${camera.height}`);
        const buffer = options.bufferTiles !== undefined ? Math.max(0, options.bufferTiles) : 0;
        
        if (!this.masterSheet || !this.masterSpriteData || !this.tileData) {
            Logger.warn("[TilemapRenderer.draw] Assets not ready or tileData missing.");
            return;
        }
        if (!camera || camera.x === undefined || camera.y === undefined || camera.width === undefined || camera.height === undefined) {
            Logger.warn("[TilemapRenderer.draw] Invalid camera object provided for culling.");
            return;
        }
        if (!this.tileSize || this.tileSize <= 0) {
            Logger.warn("[TilemapRenderer.draw] Invalid tileSize.");
            return;
        }

        // Culling logic still uses camera.x, camera.y to determine tile range
        let viewStartCol = Math.floor(camera.x / this.tileSize);
        let viewEndCol = Math.ceil((camera.x + camera.width) / this.tileSize);
        let viewStartRow = Math.floor(camera.y / this.tileSize);
        let viewEndRow = Math.ceil((camera.y + camera.height) / this.tileSize);

        const bufferedStartCol = viewStartCol - buffer;
        const bufferedEndCol = viewEndCol + buffer;
        const bufferedStartRow = viewStartRow - buffer;
        const bufferedEndRow = viewEndRow + buffer;

        const clampedStartCol = Math.max(0, bufferedStartCol);
        const clampedEndCol = Math.min(this.cols - 1, bufferedEndCol);
        const clampedStartRow = Math.max(0, bufferedStartRow);
        const clampedEndRow = Math.min(this.rows - 1, bufferedEndRow);

        Logger.trace(`[TM CLAMPED] Clamped Tile Range: C(${clampedStartCol}-${clampedEndCol}), R(${clampedStartRow}-${clampedEndRow})`);

        for (let row = clampedStartRow; row <= clampedEndRow; row++) {
            for (let col = clampedStartCol; col <= clampedEndCol; col++) {
                const tileId = this.tileData[row][col];
                const tileTypeInfo = this.tileConfig.MAP[tileId];

                if (tileTypeInfo && tileTypeInfo.spriteName) {
                    const spriteInfo = this.masterSpriteData.frames[tileTypeInfo.spriteName];
                    if (spriteInfo) {
                        const worldDrawX = col * this.tileSize;
                        const worldDrawY = row * this.tileSize;
                        
                        // REMOVED: screenDrawX/Y calculation that subtracted camera.x/y

                        const sX = spriteInfo.frame.x;
                        const sY = spriteInfo.frame.y;
                        const sW = spriteInfo.frame.w;
                        const sH = spriteInfo.frame.h;
                        ctx.drawImage(
                            this.masterSheet,
                            sX, sY, sW, sH,
                            Math.round(worldDrawX), // Draw at WORLD X
                            Math.round(worldDrawY), // Draw at WORLD Y
                            this.tileSize, this.tileSize
                        );
                    }
                }
            }
        }
    }

    getTileAt(worldX, worldY) {
        if (!this.tileData) return null;
        const col = Math.floor(worldX / this.tileSize);
        const row = Math.floor(worldY / this.tileSize);

        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            const tileId = this.tileData[row][col];
            return this.tileConfig.MAP[tileId] ? { id: tileId, ...this.tileConfig.MAP[tileId] } : null;
        }
        return null;
    }

    getTileByGrid(col, row) {
        if (!this.tileData) return null;
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            const tileId = this.tileData[row][col];
            return this.tileConfig.MAP[tileId] ? { id: tileId, ...this.tileConfig.MAP[tileId] } : null;
        }
        return null;
    }

    getMapWidth() {
        return this.cols * this.tileSize;
    }

    getMapHeight() {
        return this.rows * this.tileSize;
    }

    getTileIdAt(col, row) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            return this.tileData[row][col];
        }
        return -1; 
    }

    isTileSolid(col, row) {
        const tileId = this.getTileIdAt(col, row);
        if (tileId === -1) {
            return true; 
        }
        const tileProperties = this.tileConfig.MAP[tileId];
        if (tileProperties && tileProperties.solid === true) { 
            return true;
        }
        return false; 
    }
}
