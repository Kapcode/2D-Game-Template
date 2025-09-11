import { initInput, isActionActive } from './input.js';
import { Player } from './Player.js';
import{ setPlayer } from './main.js';
import * as globals from './globals.js';
// In main.js or wherever your Pickle update logic resides
// import { isActionActive } from './input.js'; // Ensure it's imported in this file too
class PicklePlayer extends Player {
    constructor(x, y, animationName, spriteScale,health,speed,tilemap) {
        super(x, y, animationName, spriteScale,health,speed,tilemap); // Assumes Player constructor uses globals.ANIMATIONS if needed
        this.entityType = "player_pickle";
    }
}

export function createPicklePlayerInstance(x, y, animationName, spriteScale,health,speed,tilemap) {
    const pPickle1 = new PicklePlayer(
        x, // <<< USE PARAMETER
        y, // <<< USE PARAMETER
        animationName, // <<< USE PARAMETER
        spriteScale,   // <<< USE PARAMETER
        health,        // <<< USE PARAMETER
        speed,           // <<< USE PARAMETER
        tilemap          // <<< USE PARAMETER
    );
    console.log("[PickleMan.js]  pPickle1 instance created with PARAMS and assigned:", pPickle1);
    setPlayer(pPickle1); // This updates the global 'player' in main.js
    return pPickle1;     // Return the instance
}
// Remember to call this in your game loop's update phase:
// In updateGameLogic(deltaTime):
//   const master = activeGameElements.find(el => el.isPickle === true);
//   if (master) {
//     updatePickleMovement(master, deltaTime);
//   }
