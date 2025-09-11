export function openNativeSettingsFromJS() {
    if (typeof AndroidBridge !== "undefined" && AndroidBridge !== null) {
        AndroidBridge.openNativeSettings();
    } else {
        console.warn("AndroidBridge is not defined. Cannot open native settings.");
        // Maybe redirect to a web-based settings page if this is a PWA
        // or just do nothing.
    }
}






//saving-data-to-local-storage
// --- Game Settings ---
export let settings = {
    soundVolume: 0.75,
    musicVolume: 0.5,
    difficulty: "normal", // "peaceful" , "easy", "normal", "hard" , "hardcore"
    playerName: "Player1"
};

export function saveSettings() {
    try {
        localStorage.setItem('gameSettings', JSON.stringify(settings));
        console.log('Settings saved to localStorage.');
    } catch (e) {
        console.error('Error saving settings to localStorage:', e);
        // Handle potential errors (e.g., storage full, though rare for small settings)
    }
}

// --- Game Progress ---
export let gameProgress = {
    levelReached: 1,
    highScore: 0,
    coinsCollected: 0,
    achievements: {
        foundSecret1: false,
        defeatedBoss1: false
    }
};

export function saveProgress() {
    try {
        localStorage.setItem('gameProgress', JSON.stringify(gameProgress));
        console.log('Progress saved to localStorage.');
    } catch (e) {
        console.error('Error saving progress to localStorage:', e);
    }
}

//loading-data-from-local-storage

export function loadSettings() {
    try {
        const storedSettings = localStorage.getItem('gameSettings');
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
            console.log('Settings loaded from localStorage:', settings);
        } else {
            console.log('No saved settings found. Using defaults.');
            // Optionally save default settings here if you want them persisted immediately
            // saveSettings();
        }
    } catch (e) {
        console.error('Error loading settings from localStorage:', e);
        // Handle potential errors (e.g., corrupted JSON) by falling back to defaults
    }
    // Apply settings (e.g., update actual volume controls in your audio manager)
    applyGameSettings();
}

export function loadProgress() {
    try {
        const storedProgress = localStorage.getItem('gameProgress');
        if (storedProgress) {
            gameProgress = JSON.parse(storedProgress);
            console.log('Progress loaded from localStorage:', gameProgress);
        } else {
            console.log('No saved progress found. Starting fresh.');
        }
    } catch (e) {
        console.error('Error loading progress from localStorage:', e);
    }
    // Update game state based on loaded progress
    applyGameProgress();
}

export function applyGameSettings() {
    // Example: Update your game's actual volume based on loaded settings.soundVolume
    if (window.myAudioManager && typeof window.myAudioManager.setSoundVolume === 'function') {
         window.myAudioManager.setSoundVolume(settings.soundVolume);
    }
    // Update UI elements for settings if you have a settings screen
}

export function applyGameProgress(){
    // Example: Set the player's starting level, coins, etc.
    // player.currentLevel = gameProgress.levelReached;
    // player.coins = gameProgress.coinsCollected;
}


// --- Call these when your game starts/initializes ---
// It's good practice to load settings before progress,
// as progress might depend on certain game configurations.
// window.onload = function() { // Or your game's init function
//     loadSettings();
//     loadProgress();
//     // ... rest of your game initialization ...
// };




export function updateSettingsFromUI(){
    // Example: Update settings object from UI elements
    // Assuming you have input elements with IDs matching the settings keys
    const soundVolumeInput = document.getElementById('soundVolume');
    const musicVolumeInput = document.getElementById('musicVolume');
    const difficultySelect = document.getElementById('difficulty');
    const playerNameInput = document.getElementById('playerName');

    if (soundVolumeInput) {
        settings.soundVolume = parseFloat(soundVolumeInput.value);
    }
    if (musicVolumeInput) {
        settings.musicVolume = parseFloat(musicVolumeInput.value);
    }
    if (difficultySelect) {
        settings.difficulty = difficultySelect.value;
    }   
    if (playerNameInput) {
        settings.playerName = playerNameInput.value.trim() || "Player1"; // Default to "Player1" if empty
    }
    
    // Optionally save settings immediately after updating
    saveSettings();
    applyGameSettings(); // Apply updated settings to the game
    console.log('Settings updated from UI:', settings);
    // You can also update any UI elements that display these settings .. like player name
    //const playerNameDisplay = document.getElementById('playerNameDisplay');

}