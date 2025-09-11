export function openNativeSettingsFromJS() {
    if (typeof AndroidBridge !== "undefined" && AndroidBridge !== null) {
        AndroidBridge.openNativeSettings();
    } else {
        console.warn("AndroidBridge is not defined. Cannot open native settings.");
        // Maybe redirect to a web-based settings page if this is a PWA
        // or just do nothing.
    }
}

const soundVolumeInput = document.getElementById('soundVolume');
const soundVolumeValueDisplay = document.getElementById('soundVolumeValue');
const musicVolumeInput = document.getElementById('musicVolume');
const musicVolumeValueDisplay = document.getElementById('musicVolumeValue');
const rotationLock = document.getElementById('rotationLock');




//saving-data-to-local-storage
// --- Game Settings ---
export let settings = {
    soundVolume: 0.75,
    musicVolume: 0.5,
    difficulty: "normal", // "peaceful" , "easy", "normal", "hard" , "hardcore"
    playerName: "Player1",
    rotationLock: false
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
        const rawStoredSettings = localStorage.getItem('gameSettings');
        console.log("RAW from localStorage on load:", rawStoredSettings); // <<< ADD THIS

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
    populateSettingsUI();// Populate UI with loaded settings // do this in main, or here, you choose
    //double called, no issue here.
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
// In settingsManagement.js or your main UI script

export function populateSettingsUI() {
    if (!settings) { // 'settings' is your global settings object from settingsManagement.js
        console.warn("populateSettingsUI: Settings object is not available.");
        return;
    }
    console.log("Populating UI with current settings:", JSON.parse(JSON.stringify(settings))); // Good for debugging

    const soundVolumeInput = document.getElementById('soundVolume');
    const musicVolumeInput = document.getElementById('musicVolume');
    const difficultySelect = document.getElementById('difficulty');
    const playerNameInput = document.getElementById('playerName'); // Ensure this ID matches your HTML input

    if (soundVolumeInput && typeof settings.soundVolume !== 'undefined') {
        soundVolumeInput.value = settings.soundVolume;
        // Update any visual display for the slider value too
        const display = document.getElementById('soundVolumeValue');
        if (display) display.textContent = Math.round(settings.soundVolume * 100) + '%';
    }
    if (musicVolumeInput && typeof settings.musicVolume !== 'undefined') {
        musicVolumeInput.value = settings.musicVolume;
        const display = document.getElementById('musicVolumeValue');
        if (display) display.textContent = Math.round(settings.musicVolume * 100) + '%';
    }
    if (difficultySelect && typeof settings.difficulty !== 'undefined') {
        difficultySelect.value = settings.difficulty;
    }
    if (playerNameInput && typeof settings.playerName !== 'undefined') {
        playerNameInput.value = settings.playerName;
    } else if (playerNameInput) {
        playerNameInput.value = ""; // Clear it if not defined in settings, though it should be
    }

    console.log("UI population attempt finished.");
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

//run this once in DOMContentLoaded..
export function addListenersForSettingsUI(){
    // Add event listeners for live updates
    if (soundVolumeInput) {
        soundVolumeInput.addEventListener('input', () => {
            updateVolumeDisplay(soundVolumeInput.value, soundVolumeValueDisplay);
            // Optionally, if you want the game's actual volume to change live
            // without waiting for "Save", you can update the settings object
            // and apply it immediately:
            // settings.soundVolume = parseFloat(soundVolumeInput.value);
            // applyGameSettings(); // Or a more specific applySoundVolume()
        });
    }

    if (musicVolumeInput) {
        musicVolumeInput.addEventListener('input', () => {
            updateVolumeDisplay(musicVolumeInput.value, musicVolumeValueDisplay);
            // Optionally, apply live:
            // settings.musicVolume = parseFloat(musicVolumeInput.value);
            // applyGameSettings(); // Or a more specific applyMusicVolume()
        });
    }

    //TODO create a nice little listener for toggle and text  to change locked to unlocked and vice versa
}


// Function to update a volume display
function updateVolumeDisplay(value, displayElement) {
    if (displayElement) {
        const percentage = Math.round(parseFloat(value) * 100);
        displayElement.textContent = percentage + '%';
    }
}
