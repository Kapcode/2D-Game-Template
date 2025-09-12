import { Logger } from './logger.js';

const keyStates = {};
export const actionStates = {};
let previousActionStates = {}; // Holds the previous frame's active actions for "just pressed" logic



// --- Existing keyStates, actionStates ---
// const keyStates = {};
// const actionStates = {};
// const keyMap = { ... };

// --- Pointer/Touch Configuration & State ---
const activePointers = {}; // Stores info about ALL active pointers: { pointerId: { type, startX, startY, currentX, currentY, actionInProgress } }

// Game-specific control configuration
const screenWidth = () => window.innerWidth; // Or your game canvas width
const MOVEMENT_AREA_MAX_X_PERCENT = 0.5; // Left 50% of the screen for movement

const JOYSTICK_DEAD_ZONE = 20; // Pixels from initial touch before movement registers
const JOYSTICK_MAX_RADIUS = 75; // Max visual drag distance for joystick, can be used for sensitivity scaling

let movementPointerId = null;
let jumpPointerId = null; // To track a potential jump tap

// --- Event Handlers for Pointer Events ---

function handlePointerDown(event) {
    const x = event.clientX;
    const y = event.clientY;
    const pointerId = event.pointerId;

    // Prevent default browser actions for game interactions
    event.preventDefault();
    // Try to capture the pointer so events continue to come to this element even if pointer moves outside
    event.target.setPointerCapture(pointerId);


    if (activePointers[pointerId]) {
        return; // Already tracking this pointer
    }

    if (x < screenWidth() * MOVEMENT_AREA_MAX_X_PERCENT) {
        // --- Movement Area ---
        if (movementPointerId === null) { // Only one finger for movement at a time
            movementPointerId = pointerId;
            activePointers[pointerId] = {
                type: 'movement',
                startX: x,
                startY: y,
                currentX: x,
                currentY: y,
                actionInProgress: null // e.g., 'moveLeft', 'moveRight'
            };
            // Logger.debug('Input', `Movement pointer ${pointerId} down at (${x}, ${y})`);
        } else {
            // Another finger touched movement area while one is active - ignore or handle as secondary action?
            // For now, let's keep it simple: one movement control.
            // Logger.debug('Input', `Ignored additional pointer ${pointerId} in movement area.`);
        }
    } else {
        // --- Jump Area ---
        // We allow a jump tap even if movement is active with another finger
        if (jumpPointerId === null) { // Only track one potential jump tap at a time
            jumpPointerId = pointerId;
            activePointers[pointerId] = {
                type: 'potential_jump',
                startX: x,
                startY: y,
                currentX: x,
                currentY: y,
                actionInProgress: 'jump_intent' // Mark intent
            };
            // For immediate feedback you could set jump true here, but usually jump on release (tap)
            //actionStates['jump'] = true; // If jump on press
            Logger.debug('Input', `Potential jump pointer ${pointerId} down at (${x}, ${y})`);
            console.log(`Potential jump pointer ${pointerId} down at (${x}, ${y})`);
        } else {
            Logger.debug('Input', `Ignored additional pointer ${pointerId} in jump area while another jump is pending.`);
        }
    }
}

function handlePointerMove(event) {
    const pointerId = event.pointerId;
    const pointerInfo = activePointers[pointerId];

    if (!pointerInfo) {
        return;
    }
    event.preventDefault();

    pointerInfo.currentX = event.clientX;
    pointerInfo.currentY = event.clientY;

    if (pointerInfo.type === 'movement') {
        const deltaX = pointerInfo.currentX - pointerInfo.startX;
        const deltaY = pointerInfo.currentY - pointerInfo.startY; // If you need up/down movement

        // Reset previous frame's movement based on this stick
        if (actionStates['moveLeftStick']) actionStates['moveLeftStick'] = false;
        if (actionStates['moveRightStick']) actionStates['moveRightStick'] = false;
        // if (actionStates['moveUpStick']) actionStates['moveUpStick'] = false;
        // if (actionStates['moveDownStick']) actionStates['moveDownStick'] = false;


        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > JOYSTICK_DEAD_ZONE) {
            // Normalize/clamp movement if desired, or use raw deltaX for sensitivity
            // For this example, simple left/right based on dominant axis or threshold
            if (Math.abs(deltaX) > Math.abs(deltaY) || true) { // Prioritize horizontal or always allow
                if (deltaX < 0) {
                    actionStates['moveLeftStick'] = true; // Use a different action name to distinguish from keyboard
                    actionStates['moveRightStick'] = false;
                    pointerInfo.actionInProgress = 'moveLeftStick';
                } else {
                    actionStates['moveRightStick'] = true;
                    actionStates['moveLeftStick'] = false;
                    pointerInfo.actionInProgress = 'moveRightStick';
                }
            }
            // Add similar logic for deltaY if up/down movement is needed from the stick
            // Logger.debug('Input', `Movement pointer ${pointerId} moved. dX: ${deltaX.toFixed(2)}, dY: ${deltaY.toFixed(2)} -> ${pointerInfo.actionInProgress}`);

        } else {
            // Inside dead zone, no movement
            pointerInfo.actionInProgress = null;
        }
    } else if (pointerInfo.type === 'potential_jump') {
        const dragDistance = Math.sqrt(
            Math.pow(pointerInfo.currentX - pointerInfo.startX, 2) +
            Math.pow(pointerInfo.currentY - pointerInfo.startY, 2)
        );
        // Make this threshold much larger for taps, or even specific to a "swipe to cancel" feature if you had one
        const JUMP_TAP_DRAG_CANCEL_THRESHOLD = JOYSTICK_DEAD_ZONE * 5; // Experiment with this value (e.g., 3, 4, 5 times dead zone)

        if (dragDistance > JUMP_TAP_DRAG_CANCEL_THRESHOLD && pointerInfo.actionInProgress === 'jump_intent') {
            console.log(`[Input Mobile DEBUG] P${pointerId} Jump intent CANCELLED for pointer ${pointerId} due to drag > ${JUMP_TAP_DRAG_CANCEL_THRESHOLD}.`);
            pointerInfo.actionInProgress = null; // Cancel jump intent
        }
    }
}

function handlePointerUpOrCancel(event) { // Combine up and cancel logic
    const pointerId = event.pointerId;
    const pointerInfo = activePointers[pointerId];

    if (!pointerInfo) {
        return;
    }
    event.preventDefault();
    event.target.releasePointerCapture(pointerId);


    // Logger.debug('Input', `Pointer ${pointerId} up/cancel. Type: ${pointerInfo.type}, Action: ${pointerInfo.actionInProgress}`);

    if (pointerInfo.type === 'movement') {
        if (pointerInfo.actionInProgress === 'moveLeftStick') {
            actionStates['moveLeftStick'] = false;
        } else if (pointerInfo.actionInProgress === 'moveRightStick') {
            actionStates['moveRightStick'] = false;
        }
        // Reset others if needed:
        // actionStates['moveUpStick'] = false;
        // actionStates['moveDownStick'] = false;
        movementPointerId = null; // Free up movement control
    } else if (pointerInfo.type === 'potential_jump') {
        if (pointerInfo.actionInProgress === 'jump_intent') { // Was it still a valid jump intent?
            actionStates['jump'] = true; // JUMP ON RELEASE (TAP)
            console.log(`[Input Mobile DEBUG] P${pointerId} Jump intent confirmed for pointer ${pointerId}.`);
            // Logger.debug('Input', `JUMP action triggered by pointer ${pointerId}!`);
            // Set jump to false after a short delay or in game loop if it's a "just pressed" event
            // For now, it will stay true until another input changes it, or game logic resets it.
            // Consider:
            // setTimeout(() => { actionStates['jump'] = false; }, 100); // Simple way to make it a momentary press
        }
        // If jump was set on press, you'd set it to false here:
        // else { actionStates['jump'] = false; }
        jumpPointerId = null;
    }

    delete activePointers[pointerId];
}

// --- Public API for querying input ---
/**
 * Checks if a specific game action is currently active.
 * Combines keyboard and touch controls.
 * @param {string} actionName - The name of the action (e.g., 'moveLeft', 'jump', 'moveRightStick').
 * @returns {boolean} True if the action is active, false otherwise.
 */






// You'll also need your handleKeyDown, handleKeyUp, keyMap, and original isKeyDown if you're keeping keyboard support.
// Make sure actionStates like 'moveLeft', 'moveRight', 'jump' are consistently used or mapped.
// For example, isActionActive('moveLeft') should return true if EITHER the 'a' key is pressed OR the touch stick is to the left.
// The provided `isActionActive` is a starting point for this consolidation.


// --- Configuration: Map keys to game actions ---
// This allows easy remapping later
const keyMap = {
    // Movement
    'ArrowLeft': 'moveLeft',
    'a': 'moveLeft',
    'ArrowRight': 'moveRight',
    'd': 'moveRight',
    'ArrowUp': 'moveUp', // Or 'jump'
    'w': 'moveUp',     // Or 'jump'
    'ArrowDown': 'moveDown', // Or 'crouch'
    's': 'moveDown',   // Or 'crouch'

    // Actions
    ' ': 'jump',        // Space bar for jump
    'Space': 'jump',
    'Enter': 'actionPrimary', // Or 'fire', 'interact'
    'Control': 'actionSecondary', // Or 'specialAbility'
    'Shift': 'sprint',

    // UI / System
    'Escape': 'pauseGame',
    'p': 'pauseGame',
    'm': 'toggleMute'
    // Add more mappings as needed
};

// --- Event Listeners ---

function handleKeyDown(event) {
    const originalKey = event.key;
    const processedKey = originalKey.toLowerCase();
    keyStates[processedKey] = true;

    let finalAction = keyMap[processedKey];
    if (!finalAction) {
        finalAction = keyMap[originalKey]; // Fallback for keys not in lowercase in map (e.g. 'ArrowLeft', 'Shift')
    }

    if (finalAction) {
        if (finalAction === 'moveLeft') {
            actionStates['moveLeft'] = true;
            actionStates['moveRight'] = false;
        } else if (finalAction === 'moveRight') {
            actionStates['moveRight'] = true;
            actionStates['moveLeft'] = false;
        } else {
            // For other actions (jump, sprint, pauseGame, non-conflicting movements etc.)
            actionStates[finalAction] = true;
        }
        // Logger.debug('Input', `Action started: ${finalAction} (Key: ${originalKey} -> ${processedKey})`);
    }
}

function handleKeyUp(event) {
    const originalKey = event.key;
    const processedKey = originalKey.toLowerCase();
    keyStates[processedKey] = false;

    let actionEnded = keyMap[processedKey];
    if (!actionEnded) {
        actionEnded = keyMap[originalKey]; // Fallback
    }

    if (actionEnded) {
        actionStates[actionEnded] = false; // Set the primary action for the released key to false
        // Logger.debug('Input', `Action ended: ${actionEnded} (Key: ${originalKey} -> ${processedKey})`);

        // Reactivation logic for movement
        if (actionEnded === 'moveLeft') {
            // 'moveLeft' key was released. Check if any 'moveRight' key is still pressed.
            for (const mapKey in keyMap) {
                if (keyMap[mapKey] === 'moveRight' && keyStates[mapKey.toLowerCase()]) {
                    actionStates['moveRight'] = true; // Reactivate moveRight
                    // actionStates['moveLeft'] is already false from the line above
                    break; 
                }
            }
        } else if (actionEnded === 'moveRight') {
            // 'moveRight' key was released. Check if any 'moveLeft' key is still pressed.
            for (const mapKey in keyMap) {
                if (keyMap[mapKey] === 'moveLeft' && keyStates[mapKey.toLowerCase()]) {
                    actionStates['moveLeft'] = true; // Reactivate moveLeft
                    // actionStates['moveRight'] is already false
                    break;
                }
            }
        }
        // Add similar blocks for 'moveUp'/'moveDown' if they should also have this override behavior
    }
}

// --- Public API for querying input ---

/**
 * Checks if a specific game action is currently active (key is held down).
 * @param {string} actionName - The name of the action (e.g., 'moveLeft', 'jump').
 * @returns {boolean} True if the action is active, false otherwise.
 */

export function isActionActive(actionName) {
    // Check direct mapped keyboard/pointer actions first
    if (actionStates[actionName]) {
        return true;
    }
    // Consolidate stick movement into general movement actions for game logic
    if (actionName === 'moveLeft' && actionStates['moveLeftStick']) {
        return true;
    }
    if (actionName === 'moveRight' && actionStates['moveRightStick']) {
        return true;
    }
    // Add moveUp/moveDown if you implement them for the stick
    return false;
}
/**
 * Checks if a specific key is currently pressed down.
 * Useful for direct key checks if an action isn't mapped.
 * @param {string} keyName - The key identifier (e.g., 'a', 'ArrowLeft', ' ').
 * @returns {boolean} True if the key is pressed, false otherwise.
 */
export function isKeyDown(keyName) {
    return !!keyStates[keyName.toLowerCase()];
}
export function isActionJustPressed(actionName) { // <<<< Ensure 'export' keyword is here
    return !!actionStates[actionName] && !previousActionStates[actionName];
}
/**
 * (Advanced) Checks if an action was just pressed in this frame.
 * This requires a bit more state management (tracking previous frame's state).
 * For now, we'll keep it simple with isActionActive.
 * You could add:
 * let previousActionStates = {};
 * export function isActionJustPressed(actionName) {
 *     return !!actionStates[actionName] && !previousActionStates[actionName];
 * }
 * // And then in an updateInputState() function called once per frame:
 * // previousActionStates = { ...actionStates };
 */


// --- Initialization ---
/**
 * Initializes the input listeners. Call this once when the game starts.
 */
// --- Initialization ---
export function initInput() {
    // Clear any previous states if re-initializing
    for (const key in keyStates) delete keyStates[key];
    for (const key in actionStates) delete actionStates[key];
    previousActionStates = {};
    // Clear any previous states
    for (const key in keyStates) delete keyStates[key];
    for (const key in actionStates) delete actionStates[key]; // Reset all actions
    for (const id in activePointers) delete activePointers[id];
    movementPointerId = null;
    jumpPointerId = null;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    window.addEventListener('keydown', handleKeyDown); // Assuming handleKeyDown/Up exist
    window.addEventListener('keyup', handleKeyUp);     // Assuming handleKeyDown/Up exist
    console.log("Input system initialized.");
    const gameArea = document.getElementById('gameArea') || document.body;
    gameArea.style.touchAction = 'none'; // CRITICAL: Prevent default touch behaviors on the game area

    gameArea.addEventListener('pointerdown', handlePointerDown);
    gameArea.addEventListener('pointermove', handlePointerMove);
    gameArea.addEventListener('pointerup', handlePointerUpOrCancel);
    gameArea.addEventListener('pointercancel', handlePointerUpOrCancel); // Treat cancel like up
    // `lostpointercapture` can also be useful to reset state if capture is lost unexpectedly
    gameArea.addEventListener('lostpointercapture', (event) => {
        // Logger.debug('Input', `Lost pointer capture for ${event.pointerId}`);
        handlePointerUpOrCancel(event); // Treat as if the pointer was lifted
    });


    console.log("Input system (dynamic touch joystick/jump) initialized.");
}
/**
 * Call this if you need to remove listeners, e.g., when the game ends or player is not in control.
 */
export function removeInputListeners() {
    const gameArea = document.getElementById('gameArea') || document.body;
    gameArea.removeEventListener('pointerdown', handlePointerDown);
    gameArea.removeEventListener('pointermove', handlePointerMove);
    gameArea.removeEventListener('pointerup', handlePointerUpOrCancel);
    gameArea.removeEventListener('pointercancel', handlePointerUpOrCancel);
    gameArea.removeEventListener('lostpointercapture', handlePointerUpOrCancel);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    console.log("Input system listeners removed.");
    console.log("Input system listeners (dynamic touch) removed.");
}
/**
 * Call this function at the VERY END of your game loop, after all updates and rendering.
 * It copies the current actionStates to previousActionStates for the next frame's
 * isActionJustPressed logic.
 */
export function updateInputFrameEnd() { //when i release prosses an action on release... i need to reset value.
    // Shallow copy is usually fine for a flat object of booleans/simple values
    previousActionStates = { ...actionStates };



    if (actionStates['jump']) {
        actionStates['jump'] = false;
        // This makes actionStates['jump'] false *before* the next call to isActionJustPressed
        // in the *next* game frame, assuming no new jump input happens to set it true again.
    }
    // IMPORTANT: For actions that should only trigger once per press (like 'jump'
    // if you are using 'isActionJustPressed'), you might need to clear them
    // from actionStates here IF they are not automatically cleared by a keyUp/pointerUp event
    // that sets them to false.
    //
    // If a 'jump' action is set to true on keydown/pointerup and never set to false by
    // a corresponding keyup/pointer-no-longer-active event, then using only
    // isActionJustPressed will work for one frame, but actionStates['jump'] will remain true.
    // This is generally fine if only isActionJustPressed('jump') is checked by game logic.
    //
    // However, if you want actionStates['jump'] to truly reflect only the *moment* of the press
    // and then be false, you could do:
    // if (actionStates['jump'] && previousActionStates['jump']) { // If it was pressed this frame and last (meaning it was just caught by isActionJustPressed)
    //     actionStates['jump'] = false; // Option to clear it for the next frame
    // }
    // A simpler way: If 'jump' is set true by an event, isActionJustPressed consumes it.
    // The Player's handleInput calls player.jump(). That's it. actionStates['jump'] can remain true
    // until the key is released and a keyup event sets actionStates['jump'] = false.
    // The key is that isActionJustPressed will only return true for that one frame transition.

    // For movement actions ('moveLeft', 'moveRight') that are set by keyDown
    // and cleared by keyUp, this simple copy is fine.
}

// Example of how you might update previous states for "just pressed" logic
// This would be called at the END of your game loop's input processing phase.
// export function updateInputFrameEnd() {
//     previousActionStates = { ...actionStates };
// }
