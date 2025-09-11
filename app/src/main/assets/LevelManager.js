// In LevelManager.js
export class LevelManager {
    constructor() {
        this.manifest = null;             // Will hold the parsed manifest data
        this.currentLevelIndex = -1;      // Index in the manifest.levels array, -1 means no level loaded
        this.currentLevelData = null;       // Will hold the parsed JSON data for the CURRENTLY loaded level
        this.isLoadingManifest = false;
        this.isLoadingLevel = false;
    }

    /**
     * Loads the level manifest file. This should be called once, typically at game startup.
     * @param {string} manifestPath - The path to the levels-manifest.json file.
     * @returns {Promise<boolean>} True if manifest loaded successfully, false otherwise.
     */
    async loadManifest(manifestPath = 'levels/levels-manifest.json') {
        if (this.isLoadingManifest) {
            console.warn("LevelManager: Manifest is already being loaded.");
            return false; // Or a promise that resolves when current loading is done
        }
        if (this.manifest) {
            console.log("LevelManager: Manifest already loaded.");
            return true;
        }

        this.isLoadingManifest = true;
        console.log(`[LevelManager] Attempting to load manifest from: ${manifestPath}`);

        try {
            const response = await fetch(manifestPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching manifest ${manifestPath}`);
            }
            this.manifest = await response.json();
            console.log("[LevelManager] Manifest loaded successfully:", this.manifest);
            this.isLoadingManifest = false;
            return true;
        } catch (error) {
            console.error(`[LevelManager] Failed to load manifest: ${manifestPath}`, error);
            this.manifest = null; // Clear possibly partial data
            this.isLoadingManifest = false;
            return false;
        }
    }

    /**
     * Loads a specific level by its ID (from the manifest) or by its index in the manifest.
     * @param {string|number} levelIdentifier - The ID of the level (e.g., "level1") or its index.
     * @returns {Promise<object|null>} The loaded level data, or null on failure.
     */
    async loadLevel(levelIdentifier) {
        if (!this.manifest) {
            console.error("LevelManager: Manifest not loaded. Cannot load level.");
            return null;
        }
        if (this.isLoadingLevel) {
            console.warn("LevelManager: Already loading a level.");
            return null; // Or return promise of current load
        }

        let levelInfo;
        let levelIndex = -1;

        if (typeof levelIdentifier === 'number') {
            levelIndex = levelIdentifier;
            if (levelIndex >= 0 && levelIndex < this.manifest.levels.length) {
                levelInfo = this.manifest.levels[levelIndex];
            }
        } else if (typeof levelIdentifier === 'string') {
            levelInfo = this.manifest.levels.find(l => l.id === levelIdentifier);
            if (levelInfo) {
                levelIndex = this.manifest.levels.indexOf(levelInfo);
            }
        }

        if (!levelInfo) {
            console.error(`LevelManager: Level with identifier "${levelIdentifier}" not found in manifest.`);
            return null;
        }

        this.isLoadingLevel = true;
        const levelFileName = levelInfo.fileName;
        // Assuming your level files are in a 'levels/' directory relative to where your HTML is served
        const levelFilePath = `levels/${levelFileName}`;
        console.log(`[LevelManager] Attempting to load level file: ${levelFilePath} (ID: ${levelInfo.id})`);

        try {
            const response = await fetch(levelFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching ${levelFilePath}`);
            }
            this.currentLevelData = await response.json();
            this.currentLevelIndex = levelIndex; // Update current level index
            console.log(`[LevelManager] Successfully loaded and parsed level: ${levelFileName}`, this.currentLevelData);

            this.isLoadingLevel = false;
            return this.currentLevelData; // Return the parsed level data
        } catch (error) {
            console.error(`[LevelManager] Failed to load level: ${levelFileName}`, error);
            this.currentLevelData = null;
            this.currentLevelIndex = -1;
            this.isLoadingLevel = false;
            return null;
        }
    }

    /**
     * Loads the default starting level specified in the manifest.
     */
    async loadDefaultLevel() {
        if (!this.manifest) {
            console.error("LevelManager: Manifest not loaded. Cannot load default level.");
            return null;
        }
        if (!this.manifest.defaultStartLevel) {
            console.error("LevelManager: No defaultStartLevel defined in manifest. Loading first level instead.");
            return this.loadLevel(0); // Load by index 0 if no default
        }
        // Find the level object by its fileName
        const defaultLevelInfo = this.manifest.levels.find(l => l.fileName === this.manifest.defaultStartLevel);
        if (!defaultLevelInfo) {
            console.error(`LevelManager: defaultStartLevel "${this.manifest.defaultStartLevel}" not found in manifest levels array. Loading first level instead.`);
            return this.loadLevel(0);
        }
        return this.loadLevel(defaultLevelInfo.id); // Load by its ID
    }

    /**
     * Loads the next level in sequence from the manifest.
     * @returns {Promise<object|null>} The loaded level data, or null if no next level or on failure.
     */
    async loadNextLevel() {
        if (!this.manifest) {
            console.error("LevelManager: Manifest not loaded. Cannot load next level.");
            return null;
        }
        if (this.currentLevelIndex === -1 && this.manifest.levels.length > 0) {
            // No level currently loaded, or previous load failed, try loading the first one
            console.warn("LevelManager: No current level loaded. Attempting to load the first level as 'next'.");
            return this.loadLevel(0);
        }

        const nextLevelIndex = this.currentLevelIndex + 1;
        if (nextLevelIndex >= 0 && nextLevelIndex < this.manifest.levels.length) {
            console.log(`[LevelManager] Attempting to load next level (index: ${nextLevelIndex})`);
            return this.loadLevel(nextLevelIndex);
        } else {
            console.log("[LevelManager] No more levels or invalid next level index. End of game or error.");
            // Here you might trigger a "Game Complete" state
            return null;
        }
    }

    getCurrentLevelData() {
        return this.currentLevelData;
    }

    getCurrentLevelInfo() {
        if (!this.manifest || this.currentLevelIndex === -1) {
            return null;
        }
        return this.manifest.levels[this.currentLevelIndex];
    }

    /**
     * Returns the array of level information objects from the manifest.
     * @returns {Array<object>|null} Array of levels, or null if manifest not loaded.
     */
    getAvailableLevels() {
        if (!this.manifest || !this.manifest.levels) {
            console.warn("LevelManager: Manifest or levels array not available.");
            return null;
        }
        return this.manifest.levels;
    }

    isManifestLoaded() {
        return this.manifest !== null;
    }

    getTotalLevels() {
        return this.manifest ? this.manifest.totalLevels : 0;
    }

    clearCurrentLevelData() {
        this.currentLevelData = null;
        // this.currentLevelIndex = -1; // Keep currentLevelIndex unless truly resetting
        console.log("[LevelManager] Current level data object cleared. (Index remains for next level logic)");
    }
}
