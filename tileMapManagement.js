export const TILE_PROPERTIES = {
    0: { name: "empty", isSolid: false, isHazard: false },
    1: { name: "grass", isSolid: true,  isHazard: false },
    2: { name: "dirt",  isSolid: true,  isHazard: false },
    3: { name: "platform", isSolid: true,  isOneWay: true }, // One-way platform
    4: { name: "spikes", isSolid: false, isHazard: true  } // Not solid, but hurts
    // Add more tile types as needed
};
export const TILE_SIZE = 32; // pixels

// 0 = empty, 1 = grass, 2 = dirt, 3 = platform, 4 = spikes (hazard)
export const levelData = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    [0, 0, 0, 0, 0, 3, 3, 3, 0, 0 ], // A platform
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    [1, 1, 2, 2, 2, 2, 2, 2, 1, 1], // Ground
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]  // More ground
];
export function handleTilemapCollisions(entity) {
    // --- (X-axis collision handling would go here first) ---

    // --- Y-axis collision handling ---
    // Store original y before applying velocity for one-way platform check
    let oldY = entity.y;

    entity.y += entity.velocityY * deltaTime;
    entity.isGrounded = false; // Assume not grounded unless collision proves otherwise

    // Determine tile range entity spans
    let startCol = Math.floor(entity.x / TILE_SIZE);
    let endCol = Math.floor((entity.x + entity.width -1) / TILE_SIZE); // -1 to handle exact edge cases

    if (entity.velocityY > 0) { // Moving Down / Falling
        let bottomRow = Math.floor((entity.y + entity.height -1) / TILE_SIZE);
        for (let col = startCol; col <= endCol; col++) {
            const tileId = getTileIdAtTileCoords(col, bottomRow); // Helper to get tile from levelData
            const props = TILE_PROPERTIES[tileId];

            if (props && props.isSolid) {
                // One-way platform check:
                // Entity's previous bottom must be above or at the platform's top
                const previousBottom = oldY + entity.height;
                const platformTop = bottomRow * TILE_SIZE;

                if (props.isOneWay && previousBottom > platformTop + 1) { // +1 for a small tolerance
                    // Was already below the platform top, fell through it (or is inside it)
                    // Allow to pass through. Or, if strict, this could be a different type of collision.
                    // For simplicity here, we assume it's passing through if it wasn't above before.
                } else {
                    entity.y = bottomRow * TILE_SIZE - entity.height;
                    entity.velocityY = 0;
                    entity.isGrounded = true;
                    break; // Stop checking other columns for this row
                }
            }
        }
    } else if (entity.velocityY < 0) { // Moving Up / Jumping
        let topRow = Math.floor(entity.y / TILE_SIZE);
        for (let col = startCol; col <= endCol; col++) {
            const tileId = getTileIdAtTileCoords(col, topRow);
            const props = TILE_PROPERTIES[tileId];

            if (props && props.isSolid && !props.isOneWay) { // Can't jump up through solid, non-oneway platforms
                entity.y = (topRow + 1) * TILE_SIZE;
                entity.velocityY = 0;
                break;
            }
        }
    }
    // Hazard check
    // After position is finalized, check if entity is overlapping hazard tiles
    // ...
}

export function getTileIdAtTileCoords(col, row) {
    if (levelData[row] && typeof levelData[row][col] === 'number') {
        return levelData[row][col];
    }
    return 0; // Default to empty if out of bounds
}
