  import { settings } from './settingsManagement.js';
  // --- Audio Pool Manager ---
    const audioPools = {}; // e.g., { 'jump': [audio1, audio2], 'shoot': [audioA, audioB, audioC] }
    const MAX_INSTANCES_PER_SOUND = 3; // Max simultaneous instances of the same sound type
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    function createAudioElement(src) {
        const audio = new Audio(src);
        audio.preload = 'auto'; // Or 'metadata'
        // Add to document body if you need controls for debugging, otherwise not necessary
        // document.body.appendChild(audio);
        return audio;
    }

    function getPooledAudio(soundId, soundSrc) {
        if (!audioPools[soundId]) {
            audioPools[soundId] = [];
        }
        let pool = audioPools[soundId];

        // Try to find an idle audio element in the pool
        for (let audio of pool) {
            if (audio.paused || audio.ended) {
                audio.currentTime = 0; // Rewind
                return audio;
            }
        }

        // If pool isn't full and no idle found, create a new one
        if (pool.length < MAX_INSTANCES_PER_SOUND) {
            const newAudio = createAudioElement(soundSrc);
            pool.push(newAudio);
            return newAudio;
        }

        // Pool is full, and all are playing. Optionally, you could steal the oldest one.
        // For now, we'll just return null (or you could throw an error / queue it)
        console.warn(`Sound pool for '${soundId}' is full.`);
        return null;
    }


    //for now everything is sound effect, later we can add music management
    export function playPooledSound(soundId, soundSrc) {
        const audio = getPooledAudio(soundId, soundSrc);
        audio.volume = settings.soundVolume ?? 0.75;
        //audio.setVolume(settings.soundVolume || 1.0); ha oops
        console.log(`Playing pooled sound: ${soundId} from source: ${soundSrc} at volume level: ${settings.soundVolume || 1.0}  with pool size: ${audioPools[soundId] ? audioPools[soundId].length : 0}`);
        if (audio) {
            audio.play().catch(e => console.error(`Error playing pooled sound ${soundId}:`, e));
        }
    }
    
    // Example Usage:
    // playPooledSound('jump', 'sounds/jump.mp3');
    // playPooledSound('shoot', 'sounds/laser.wav');
    // playPooledSound('shoot', 'sounds/laser.wav'); // Could play on a different pooled element
    // playPooledSound('shoot', 'sounds/laser.wav');
    // playPooledSound('shoot', 'sounds/laser.wav'); // This one might get ignored if pool is full

        export function setVolume(volume) {//TODO: integrate with settingsManagement.js
            // Clamp volume between 0.0 and 1.0
            const clampedVolume = Math.max(0, Math.min(1, volume));
            // Set volume for all sounds
            const sounds = document.querySelectorAll('audio');
            sounds.forEach(sound => {
                sound.volume = clampedVolume;
            });
            console.log(`Sound volume set to ${clampedVolume}`);
        }
// --- Audio Management Module ---