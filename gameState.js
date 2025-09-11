// ./gameState.js
export let gamePaused = false;
export let gameStopped = true; // Game is stopped initially
export let welcomeScreenActive = true; // Welcome screen is active initially
export let welcomeView = 'main'; // Possible values: 'main', 'levelSelect'
export let timeWhenPauseActuallyStarted = 0;
export const gameStateLogs = []; // If this is truly global state

// Functions to modify this state, also exported
export function setGamePaused(isPaused) {
    gamePaused = isPaused;
    if (isPaused) {
        timeWhenPauseActuallyStarted = performance.now();
    }
    gameStateLogs.push(`Game paused: ${gamePaused} at ${timeWhenPauseActuallyStarted}`);
    console.log(`[gameState] Game paused: ${gamePaused}`);
}

export function setGameStopped(isStopped) {
    gameStopped = isStopped;
    gameStateLogs.push(`Game stopped: ${gameStopped}`);
    console.log(`[gameState] Game stopped: ${isStopped}`);
}

export function setWelcomeScreenActive(isActive) {
    welcomeScreenActive = isActive;
    gameStateLogs.push(`Welcome screen active: ${welcomeScreenActive}`);
    console.log(`[gameState] Welcome screen active: ${welcomeScreenActive}`);
}

export function setWelcomeView(view) {
    if (view === 'main' || view === 'levelSelect') {
        welcomeView = view;
        console.log(`[GameState] Welcome view set to: ${welcomeView}`); 
    } else {
        console.error(`[GameState] Attempted to set invalid welcome view: ${view}`);
    }
}


// Add other relevant state and modifiers here