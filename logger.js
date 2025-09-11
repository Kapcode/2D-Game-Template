// logger.js (or wherever you want to define this utility)
//todo import logger in all other files // logger is implemented in: main tilemaprenderer camera.
const LOG_LEVELS = {
    NONE: 0,    // No logging
    ERROR: 1,   // Only critical errors
    WARN: 2,    // Warnings that might indicate problems
    INFO: 3,    // General informational messages (game state changes, major events)
    DEBUG: 4,   // Detailed debugging for specific modules/features
    TRACE: 5    // Highly verbose, step-by-step tracing (like tile calculations per frame)
};

// --- Configuration ---
// This is the global switch. Start with a reasonable default.
// You can change this in the console during runtime for dynamic log adjustment.
// e.g., in console: `Logger.setLogLevel(LOG_LEVELS.DEBUG);`
let currentLogLevel = LOG_LEVELS.INFO; // Default logging level//

// Optional: Per-module/tag log levels (more advanced)
// let moduleLogLevels = {
//   'TilemapRenderer': LOG_LEVELS.WARN,
//   'Physics': LOG_LEVELS.INFO,
// };
// --- End Configuration ---

const Logger = {
    LEVELS: LOG_LEVELS,

    setLogLevel: function(level) {
        if (typeof level === 'number' && level >= LOG_LEVELS.NONE && level <= LOG_LEVELS.TRACE) {
            currentLogLevel = level;
            console.log(`%c[Logger] Log level set to: ${Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level)} (${level})`, "color: blue; font-weight: bold;");
        } else {
            console.warn(`[Logger] Invalid log level: ${level}. Please use Logger.LEVELS.`);
        }
    },

    getCurrentLogLevel: function() {
        return currentLogLevel;
    },

    // Core log function - private or internal
    _log: function(level, levelColor, tag, ...messages) {
        // Basic check against global log level
        if (level <= currentLogLevel) {
            // Advanced check: Could also check moduleLogLevels here if implemented
            // if (moduleLogLevels[tag] !== undefined && level > moduleLogLevels[tag]) {
            //     return; // Module specific level overrides global for this tag
            // }

            // Apply styling to the tag
            const styledTag = `%c[${tag || 'General'}]`;
            const style = `color: ${levelColor}; font-weight: bold;`;

            // Prepend styled tag to messages
            console.log(styledTag, style, ...messages);
        }
    },

    // Public logging methods
    error: function(tag, ...messages) {
        this._log(LOG_LEVELS.ERROR, 'red', tag, ...messages);
    },

    warn: function(tag, ...messages) {
        this._log(LOG_LEVELS.WARN, 'orange', tag, ...messages);
    },

    info: function(tag, ...messages) {
        // Default console.info often has a small 'i' icon, we can use a neutral color
        this._log(LOG_LEVELS.INFO, 'dodgerblue', tag, ...messages);
    },

    debug: function(tag, ...messages) {
        this._log(LOG_LEVELS.DEBUG, 'green', tag, ...messages);
    },

    trace: function(tag, ...messages) {
        this._log(LOG_LEVELS.TRACE, 'grey', tag, ...messages);
    },

    // A special log that always shows, regardless of level (for critical init messages etc.)
    always: function(tag, ...messages) {
        const styledTag = `%c[${tag || 'System'}]`;
        const style = `color: magenta; font-weight: bold;`;
        console.log(styledTag, style, ...messages);
    }
};
export { Logger };
// Optional: Export if using modules, or attach to window for global access
// export default Logger; // If using ES6 modules
// window.Logger = Logger; // For simple global access via <script> tag

// --- Example Usage (demonstrating how you'd call it from other files) ---
// At the top of your other JS files (if not using modules and it's on window):
// const L = window.Logger; // Shorter alias

// L.setLogLevel(L.LEVELS.DEBUG); // Set the desired global log level

// L.error('PaymentProcessing', 'Credit card expired.', { cardId: 'xxxx' });
// L.warn('AssetLoader', 'Image not found, using placeholder.', 'path/to/img.png');
// L.info('GameManager', 'Level 5 started.');
// L.debug('PlayerInput', 'Jump key pressed.', { currentVelocity: player.vy });

// // This TRACE log will only show if currentLogLevel is TRACE
// L.trace('TilemapRenderer', 'Drawing tile at:', col, row, tileId);

// L.always('AppInit', 'Application Core Initialized.');
