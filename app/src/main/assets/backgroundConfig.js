// ./backgroundConfig.js

/**
 * Defines the properties for different types of background layers.
 * The numerical keys (0, 1, 2, etc.) will be used in the level.json
 * to specify which background layer to use.
 */
export const BACKGROUND_LAYER_DEFINITIONS = {
    0: {
        assetKey: 'bg_sky_calm',      // Key used in AssetManager for the sky image
        scrollFactorX: 0.05,        // Very slow scroll for distant sky
        scrollFactorY: 0.02,        // Even slower vertical scroll, or 0 if completely static vertically
        repeatX: true,              // Sky usually repeats horizontally
        repeatY: false,             // Sky usually doesn't repeat vertically (it's tall enough or fades)
        yOffset: 0,                 // Default vertical offset from the top
        zIndex: 0                   // Furthest back
    },
    1: {
        assetKey: 'bg_mountains_distant', // Key for distant mountains image
        scrollFactorX: 0.25,        // Slower than mid-ground, faster than sky
        scrollFactorY: 0.1,         // Some vertical parallax
        repeatX: true,              // Mountains often repeat horizontally
        repeatY: false,             // Usually don't repeat vertically
        yOffset: 100,               // Default Y offset (e.g., mountains start lower than sky a bit)
        zIndex: 1
    },
    2: {
        assetKey: 'bg_forest_close',    // Key for a closer forest/trees layer
        scrollFactorX: 0.6,         // Faster scroll for closer elements
        scrollFactorY: 0.5,         // More noticeable vertical parallax
        repeatX: true,              // Forest can repeat
        repeatY: false,
        yOffset: 200,               // Positioned lower to appear in front of mountains
        zIndex: 2
    },
    3: {
        assetKey: 'bg_clouds_fast',     // Key for fast-moving clouds
        scrollFactorX: 0.8,           // Faster scroll for effect
        scrollFactorY: 0.1,           // Slight vertical movement, or 0
        repeatX: true,
        repeatY: false,
        yOffset: 50,                  // Positioned somewhere in the sky
        zIndex: 3                     // In front of mountains but could be behind forest depending on effect
    }
};

/**
 * Optional: Default array of layers if a level doesn't specify any.
 * This might be useful for a global default background.
 */
export const DEFAULT_BACKGROUND_SETUP = [
    { id: 0 }, // Sky
    { id: 1 }  // Mountains
];
