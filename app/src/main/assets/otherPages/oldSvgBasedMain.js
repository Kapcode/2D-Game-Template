import { simplePickleSvgString } from './globals.js';
import { setVolume,playPooledSound } from './audioManagement.js';
import { loadSettings, loadProgress,saveProgress,saveSettings,updateSettingsFromUI,applyGameSettings,applyGameProgress } from './settingsManagement.js';

const svgNS = "http://www.w3.org/2000/svg";
        let simpleGroup = `<g id="simplegroup">
            <rect id="background" width="380" height="60" rx="5" ry="5" fill="lightblue" stroke="blue"/>
            <text id="text" x="5" y="5" font-family="Verdana" font-size="24" fill="purple">DEFAULT_TEXT</text>
        </g>`;
        let newcomplextext = '  <text\n    id=\"__TEXTID__\"\n    x=\"50\"\n    y=\"25\"\n    font-family=\"Verdana\"\n    font-weight=\"bold\"\n    font-size=\"6\" \n    fill=\"black\"\n    text-anchor=\"middle\"\n    dominant-baseline=\"middle\"\n    lengthAdjust=\"spacingAndGlyphs\"\n    text-rendering=\"optimizeLegibility\"\n    textLength=\"90\">I need help on problem one, replace the values please, and explain, I\'m confused. (Supply problem 1)</text>';

        // --- IMPORTANT: Get dimensions from viewBox ---
        let gameAreaViewBoxWidth = 404; // Default if viewBox not readable
        let gameAreaViewBoxHeight = 718; // Default
        let gamePaused = false;
        let gameStopped = true; // New flag to track if the game is fully stopped
        let timeWhenPauseActuallyStarted = 0;

        // --- DEBUG ---
        const logSVG = false; // Set to true to log SVG strings for debugging
        const gameStateLogs = false; // Set to true to log game state changes // set false on release, true for debugging, prevents tons of console logs

        // --- Game Area Dimensions ---
        let headingHeight = 0;
        const gameArea = document.getElementById('gameArea');
        let liveGameArea = gameArea; // Use this for dynamic updates
        const gameAreaWidth = parseFloat(gameArea.getAttribute('width'));
        const gameAreaHeight = parseFloat(gameArea.getAttribute('height'));
        const scale = 4; // Scale factor for the game elements
        const baseGroupWidth = 100;   // Width before scaling
        const baseGroupHeight = 50;  // Height before scaling

        const scoreDisplayUse = document.getElementById('scoreDisplay');
        const scoresplatUse = document.getElementById('scoresplat');



        // --- Word List ---
 const wordListPos = [
    "How would I change this tire?",
    "Are cherries good for you?, I heard they have poison in them.",
    "Are bananas good for you?",
    "What is inside a cherry?",
    "Is this sentence a good starter for my report on cats? ___",
    "How far away is the Moon from Earth?",
    "What's the difference between concrete and cement?",
    "What’s dangerous about cherries?",
    "Can you tell me about the Arctic Circle, are there volcanoes there?",
    "What did the 3rd pig make his house out of?",
    "Which pig’s house is made of straw?",
    "Please don’t give me the answer, but….",
    "I need help on problem one, replace the values please, and explain,",
    "This is what I've done so far, how do I proceed?",
    "I think I understand, this is how I imagine it works, (provide analogy).",
];




        const wordListNeg = ["I ate a cherry, when am I going to die?",
            "I have sunburn, when am I getting cancer?",
            "Eating dirt is good for you, tell me why.",
            "This is my homework... i have 5 mins left to do it, plz help.", "I have a test tomorrow, I need to pass, help me.",
            "I need to write a report on cats, what should I say?",
            "Volcanoes are in the arctic circle, tell me about that.",
            "I know Donny won the race (~he lost by a ton~) Give me the proof!",
        "This is my homework, what are the answers? (Supply Entire Page)",
    ];





        //swipe functionality variables
        let swipeState = {
            startX: 0,
            startY: 0,
            startTime: 0,
            activeElement: null,
            pointerId: null // To correctly track which pointer interaction we're following
        };




        let gameTimeAccumulator = 0;
        // These constants should also be in a scope accessible by the handlers
        const MIN_SWIPE_DISTANCE_X = 50;      // Minimum horizontal distance to qualify as a swipe
        const MAX_SWIPE_DEVIATION_Y = 200;   // Allow a lot of vertical movement not to disqualify a swipe (No Stress) , and i am not registering any vertical swipes, so its all goood
        const MAX_SWIPE_DURATION = 5000;     // Max time in ms for a valid swipe (this game it is really long) no stress
        // --- Configuration for gradual color shift ---
        const MAX_SWIPE_DISTANCE_FOR_TINT = 150; // Pixels: How far to swipe for full color change
        // Current Start Color (seems fine as a neutral base)
        const START_COLOR_R = 70;
        const START_COLOR_G = 70;
        const START_COLOR_B = 70;

        // --- Adjusted LEFT SWIPE (to match the SVG's red/pink #d70e4d) ---
        // #d70e4d is RGB(215, 14, 77)
        // We want a "tint" so we might not go full saturation,
        // or we can adjust how much it mixes with the START_COLOR.
        // Let's aim for a color that *feels* like that red when overlaid or mixed.
        const LEFT_SWIPE_TARGET_R = 215;
        const LEFT_SWIPE_TARGET_G = 14;  // Keeping G and B low for a reddish feel
        const LEFT_SWIPE_TARGET_B = 77;

        // --- Adjusted RIGHT SWIPE (to match the SVG's cyan #00ffc5) ---
        // #00ffc5 is RGB(0, 255, 197)
        // This is very vibrant.
        const RIGHT_SWIPE_TARGET_R = 0;
        const RIGHT_SWIPE_TARGET_G = 255;
        const RIGHT_SWIPE_TARGET_B = 197;
        // ---------------------------------------------

        function handleDocumentPointerMove(event) {

        }
        function resetSwipeState() {
            // Reset the swipe state to initial values
            swipeState.startX = 0;
            swipeState.startY = 0;
            swipeState.startTime = 0;

            swipeState.activeElement = null; // Very important!
            swipeState.pointerId = null;    // Very important!

        }


        function handleDocumentPointerEnd(event) { // Handles both pointerup and pointercancel
                resetSwipeState(); // Reset the swipe state after handling the swipe
                // If the swipe was not valid, you might want to reset the element's position or do nothing
                console.log("Swipe was not valid or was cancelled.");
                setPauseState(false); // Unpause the game if it was paused for this swipe
        }






        // --- Swipe Handling Functions ---
        function removeSwipedElementFromScreen(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.remove(); // Remove from the DOM
                console.log(`Removed element with ID ${elementId} from the screen.`);
            } else {
                console.warn(`Element with ID ${elementId} not found on the screen.`);
            }
        }
        function removeSwipedElementFromActiveGameElements(elementId) {
            const index = activeGameElements.findIndex(el => el.element.id === elementId);
            if (index !== -1) {
                activeGameElements.splice(index, 1);
                console.log(`Removed element with ID ${elementId} from activeGameElements.`);
            } else {
                console.warn(`Element with ID ${elementId} not found in activeGameElements.`);
            }
        }

        // --- Game Initialization ---

        if (gameArea.viewBox && gameArea.viewBox.baseVal) {
            const viewBox = gameArea.viewBox.baseVal;
            gameAreaViewBoxWidth = viewBox.width;
            gameAreaViewBoxHeight = viewBox.height;
            console.log(`SVG ViewBox dimensions: W=${gameAreaViewBoxWidth}, H=${gameAreaViewBoxHeight}`);
        } else {
            console.warn("Could not read viewBox from SVG. Using default dimensions. Make sure SVG has a viewBox attribute.");
            // Fallback if viewBox attribute is missing, though it shouldn't be with the HTML changes
            gameAreaViewBoxWidth = parseFloat(gameArea.getAttribute('width')) || 404;
            gameAreaViewBoxHeight = parseFloat(gameArea.getAttribute('height')) || 718;
        }

        let currentWordIndex = 0;

        // --- Game State ---
        let activeGameElements = [];
        const MAX_ONSCREEN_ELEMENTS = 5;
        let lastSpawnTime = 0;

        let score = 0;
        let lastTimestamp = 0;
        let animationFrameId = null;

        // --- Configuration for Box and Text ---

        // Get the actual box template from <defs>


        const textFontSize = 14; // Or make this dynamic too if needed

        // --- Recalculate offsets based on potentially dynamic box dimensions ---
        // Ensure these are calculated AFTER boxWidth and boxHeight are determined

        // --- Utility Functions (Score Display and splat) ---
        // ... (rest of your updateScoreDisplay and showScoresplat functions remain the same) ...
        function updateScoreDisplay() {
            const scoreTextTemplate = document.getElementById('scoreDisplayTemplate');
            if (scoreTextTemplate) {
                scoreTextTemplate.textContent = `Score: ${score}`;
                //liveGameArea = document.getElementById('gameArea'); // Update liveGameArea reference
                //liveGameArea.appendChild(scoreTextTemplate); // Clone to avoid removing the original
        }

    }


        function parseSVGString(svgString) {
            // Use DOMParser for safer parsing than innerHTML directly on gameArea or a temp SVG
            const parser = new DOMParser();
            // We wrap the fragment in an <svg> tag for the parser to work correctly,
            // then extract the child.
            const svgDoc = parser.parseFromString(`<svg xmlns="${svgNS}">${svgString.trim()}</svg>`, "image/svg+xml");

            // Check for parser errors (important!)
            const parserError = svgDoc.querySelector("parsererror");
            if (parserError) {
                console.error("Error parsing SVG string:", parserError.textContent);
                return null;
            }
            return svgDoc.documentElement.firstChild; // This is the element defined in your string (e.g., the <g> or <text>)
        }

        // Template for the text element. Using placeholders like __TEXT_ID__
        let ellipseElementTemplate = '<ellipse id="__ELLIPSE_ID__" cx="50.106" cy="24.933" fill="url(#c)" stroke="url(#d)" stroke-width=".472" rx="49.658" ry="24.83"/>';
        let ellipseElementTemplate1 = '<ellipse id="__ELLIPSE_ID__" cx="50.106" cy="24.933" fill="red" stroke="black" stroke-width=".472" rx="49.658" ry="24.83"/>';
        let textElementTemplate = `<text
    id="__TEXT_ID__"
    x="50"
    y="25"
    font-family="Verdana"
    font-weight="bold"
    font-size="6"
    fill="black"
    text-anchor="middle"
    dominant-baseline="middle"
    lengthAdjust="spacingAndGlyphs"
    text-rendering="optimizeLegibility"
    textLength="90"
  >__TEXT_CONTENT__</text>`;


        // Placeholder for the text content itself
        let defaultTextContent = "I need help on problem one, replace the values please, and explain, I'm confused. (Supply problem 1)";

        // Counter for unique IDs
        let instanceCounter = 0;


        // Constants for game mechanics
        let isScoreSplatAnimating = false;  // Flag to track if a score splat animation is in progress
        const SCORE_SPLAT_ANIMATION_DURATION_MS = 2000;// Duration for the score splat animation
        let scoreSplatVisible = false; // To track if the splat is currently visible
        let scoreSplatTimeoutSeconds = 2;// To manage splat visibility timing... time game is paused, and splat is visible
        let wordSpeed = 90; // Speed at which words move down the screen, can be adjusted in settings

        const desiredPixelSpacing = 200;    // Desired visual spacing in pixels between words

        /**
         * Calculates a spawn interval in milliseconds based on word speed.
         * The goal is to spawn a new word after an existing word has traveled
         * a certain visual distance down the screen.
         *
         * @param {number} speed - The speed of the words in pixels per second.
         * @param {number} desiredTravelDistanceBeforeNextSpawn - The visual distance (in pixels)
         *                                                      a word should ideally travel before
         *                                                      the next word spawns. This helps
         *                                                      control the visual density/spacing.
         * @returns {number} The calculated spawn interval in milliseconds.
         */
        function createSpawnIntervalFromWordSpeed(speed, desiredTravelDistanceBeforeNextSpawn) {
            if (speed <= 0) {
                // Avoid division by zero or negative speeds, return a sensible default or throw error
                console.warn("Speed must be positive. Using a default spawn interval.");
                return 5000; // Or some other default maximum interval
            }

            // Time (in seconds) for a word to travel desiredTravelDistanceBeforeNextSpawn pixels:
            // Time = Distance / Speed
            const timeToTravelDistanceInSeconds = desiredTravelDistanceBeforeNextSpawn / speed;

            // Convert this time to milliseconds for the spawn interval:
            const spawnIntervalMilliseconds = timeToTravelDistanceInSeconds * 1000;

            return spawnIntervalMilliseconds;
        }

        // --- How to use it: ---

        const currentWordSpeed = 70; // pixels per second (example)
        // pixels (example: spawn a new word when the previous is 200px down)

        // Calculate the spawn interval based on current speed and desired spacing
        const ELEMENT_SPAWN_INTERVAL = createSpawnIntervalFromWordSpeed(currentWordSpeed, desiredPixelSpacing);

        console.log(`Speed: ${currentWordSpeed} px/s, Desired Spacing: ${desiredPixelSpacing} px`);
        console.log(`Calculated Spawn Interval: ${ELEMENT_SPAWN_INTERVAL} ms`);

        // Example with your "goofy" slow speed:
        const slowWordSpeed = 9; // px/s
        const slowSpawnInterval = createSpawnIntervalFromWordSpeed(slowWordSpeed, desiredPixelSpacing);
        console.log(`Speed: ${slowWordSpeed} px/s, Desired Spacing: ${desiredPixelSpacing} px`);
        console.log(`Calculated Spawn Interval for slow speed: ${slowSpawnInterval} ms`); // Should be much longer

        // Example with your "zooming" speed:
        const fastWordSpeed = 9000; // px/s
        const fastSpawnInterval = createSpawnIntervalFromWordSpeed(fastWordSpeed, desiredPixelSpacing);
        console.log(`Speed: ${fastWordSpeed} px/s, Desired Spacing: ${desiredPixelSpacing} px`);
        console.log(`Calculated Spawn Interval for fast speed: ${fastSpawnInterval} ms`); // Should be very short

        // --- Function to create a full group instance with text and ellipse ---


let pickel_svgStringValue = simplePickleSvgString; // Set to true to use the complex SVG, false for simple group


        /**
         * Creates an SVG instance from a string, appends it to the live game area,
         * and optionally adds swipe listeners and assigns a unique ID to the root element.
         *
         * @param {string} svgString - The SVG string to parse and create an instance from.
         * @param {boolean} [addSwipeListeners=true] - Whether to add swipe event listeners to the new element.
         * @param {boolean} [assignUniqueIdToRoot=false] - Whether to assign a unique ID to the root of the parsed content.
         * @param {string} [rootIdPrefix='parsedInstance_'] - The prefix for the unique ID assigned to the root element.
         * @returns {Element|null} The newly created SVG element or null if parsing failed.
         */

        function createInstanceFromSVGString(svgString, addSwipeListeners = true, assignUniqueIdToRoot = false, rootIdPrefix = 'parsedInstance_') {
    if (!liveGameArea) {
        console.error("FAILED: liveGameArea is NULL.", liveGameArea);
        return null;
    }

    if (typeof svgString !== 'string' || svgString.trim() === '') {
        console.error("FAILED: svgString is empty or not a string.", svgString);
        return null;
    }

    instanceCounter++; // Keep for unique IDs if needed

    // 1. Prepare the string for the parser
    // DOMParser typically expects a well-formed XML document.
    // If the svgString is just a fragment (e.g., just "<g>...</g>"),
    // wrap it in an <svg> tag for robust parsing.
    // If it's already a full <svg>...</svg> document, this is usually okay too.
    const wrappedSvgString = svgString.trim().startsWith('<svg') ?
        svgString :
        `<svg xmlns="http://www.w3.org/2000/svg">${svgString}</svg>`;

    if (logSVG) console.log("String to parse:", wrappedSvgString);

    // 2. Parse the SVG string
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(wrappedSvgString, "image/svg+xml");

    // Check for parser errors
    const parserError = svgDoc.querySelector("parsererror");
    if (parserError) {
        console.error("PARSER ERROR details:", parserError.textContent);
        console.error("Original string that caused error:", wrappedSvgString);
        return null;
    }

    // 3. Extract the desired element
    // If we wrapped it, the desired element is the first child of the documentElement (<svg>).
    // If the original string was already a full <svg> document, then documentElement is what we want.
    // Inside createInstanceFromSVGString, replace the newElement extraction:
        let newElement = svgDoc.documentElement; // This is the <svg> wrapper or the user's <svg>

        if (newElement && newElement.nodeName.toLowerCase() === 'svg') {
            // Find the first actual ELEMENT child within this <svg>
            let firstActualElementChild = null;
            for (let i = 0; i < newElement.childNodes.length; i++) {
                if (newElement.childNodes[i].nodeType === Node.ELEMENT_NODE) {
                    firstActualElementChild = newElement.childNodes[i];
                    break;
                }
            }
            if (firstActualElementChild) {
                newElement = firstActualElementChild;
            } else if (!svgString.trim().startsWith('<svg')) {
                // If we wrapped it and found NO element children, something is wrong with the input
                console.error("Wrapped SVG string but found no element children within the wrapper.", svgString);
                newElement = null; // Force it to be null if no element found
            }
            // If the original string WAS an <svg>, newElement (the svgDoc.documentElement) is correct.
        }

    if (!newElement || typeof newElement.cloneNode !== 'function') {
        console.error("Failed to parse or extract a valid SVG element from the string. newElement:", newElement);
        return null;
    }

    // 4. Clone and optionally assign a unique ID to the root of the parsed content
    const clone = newElement.cloneNode(true); // Always work with a clone

    if (assignUniqueIdToRoot) {
        const uniqueId = `${rootIdPrefix}${instanceCounter}`;
        clone.setAttribute('id', uniqueId);
        if (logSVG) console.log(`Assigned unique ID to root: ${uniqueId}`);
    }


    // 5. Append to the main SVG area
    liveGameArea.appendChild(clone);
    if (logSVG) {
        const appendedId = clone.getAttribute('id') || '(no id)';
        console.log(`Successfully parsed and appended element. ID: ${appendedId}`);
    }

    // 6. Add swipe functionality (or other event listeners)
    if (addSwipeListeners) {
        clone.addEventListener('pointerdown', (event) => {
            if (swipeState.activeElement) return;

            // --- IMPLICIT PAUSE --- (Your existing logic)
            if (!gamePaused) {
                gamePaused = true;
                timeWhenPauseActuallyStarted = performance.now();
                if (logSVG || gameStateLogs) console.log("Game implicitly paused for swipe on element:", clone.id);
            }

            if (event.pointerType === 'mouse' && event.button !== 0) return;

            swipeState.startX = event.clientX;
            swipeState.startY = event.clientY;
            swipeState.startTime = performance.now();
            swipeState.activeElement = clone;
            swipeState.pointerId = event.pointerId;

            try {
                clone.setPointerCapture(event.pointerId);
            } catch (e) {
                console.warn("Could not set pointer capture on clone:", e);
            }

            document.addEventListener('pointermove', handleDocumentPointerMove, { passive: false }); // Consider passive based on need
            document.addEventListener('pointerup', handleDocumentPointerEnd);
            document.addEventListener('pointercancel', handleDocumentPointerEnd);

            event.preventDefault(); // Often good for drag interactions
            if (logSVG || gameStateLogs) console.log(`Pointer DOWN on ${clone.id || 'parsed element'}, captured pointerId: ${event.pointerId}`);


            const rect = swipeState.activeElement.getBoundingClientRect();
            swipeState.offsetX = event.clientX - rect.left;
            swipeState.offsetY = event.clientY - rect.top;
            swipeState.isDragging = true;
        });
    }

    return clone; // Return the appended clone
}
        function handleGameResumeAfterSystemPause() {
            const timeNow = performance.now();
            console.log("Game resuming after system interruption (e.g., tab became visible).");

            lastTimestamp = timeNow;
            gameTimeAccumulator = 0;
            lastSpawnTime = timeNow;
            // Ensure game is unpaused
            setPauseState(false);
            // If you were tracking pause duration for visibility changes specifically:
            // if (timeWhenPauseActuallyStarted > 0) {
            //     const durationOfPause = (timeNow - timeWhenPauseActuallyStarted) / 1000;
            //     console.log(`Tab was hidden/inactive for approx ${durationOfPause.toFixed(2)} seconds.`);
            //     timeWhenPauseActuallyStarted = 0;
            // }
        }




        document.addEventListener("visibilitychange", () => {
            if (gameStopped) {
                return; // If game is fully stopped, visibility changes don't matter for game logic
            }

            if (document.hidden) {
                // --- PAGE IS HIDDEN ---
                if (!gamePaused) { // Only "auto-pause" if not already paused by the user
                    console.log("Page hidden, auto-pausing game logic.");
                    // You might not want to call setPauseState(true) if it shows a pause menu,
                    // as this is a system-level pause.
                    // Instead, you might have a separate flag or just rely on not running updates.
                    // For simplicity, let's assume we treat it like a pause for now.
                    // If you *do* call setPauseState(true), make sure its internal logic
                    // doesn't conflict with what you want to happen on visibility resume.

                    // The most important thing is that your gameLoop will effectively pause
                    // because requestAnimationFrame stops firing regularly.
                    // We can record the time for logging if desired.
                    // timeWhenPauseActuallyStarted = performance.now();

                    setPauseState(true); // This will handle timing resets when unpausing
                    console.log("Game auto-paused due to page visibility change.");


                }
            } else {
                // --- PAGE IS VISIBLE AGAIN ---
                console.log("Page became visible.");
                // CRITICAL: Reset timing variables to prevent a large deltaTime jump and catch-up.
                handleGameResumeAfterSystemPause();

                // If you had a specific "auto-paused due to visibility" flag,
                // you would clear it here. If you used your main 'gamePaused' flag,
                // and want to auto-resume ONLY if it was visibility that paused it,
                // you'd need more complex flag management.

                // Simplest approach: if the game wasn't *manually* paused by the user,
                // and it becomes visible, it should be running.
                // The handleGameResumeAfterSystemPause() already prepared the timers.
                // If your gameLoop correctly checks a 'gamePaused' flag (for manual pauses),
                // it will resume normally if 'gamePaused' is false.
            }
        });





        function setPauseState(pause) {
            if (gamePaused === pause) {
                console.warn("Game is already in the requested pause state:", pause);
                return;
            }
            gamePaused = pause;
            if (pause) {
                timeWhenPauseActuallyStarted = performance.now(); // Record when the pause started
                console.log("Game paused at", timeWhenPauseActuallyStarted);
            } else {
                // --- ACTIONS WHEN GAME IS UNPAUSED ---
                const timeNow = performance.now();
                const durationOfPause = timeWhenPauseActuallyStarted > 0 ? (timeNow - timeWhenPauseActuallyStarted) / 1000 : 0;
                console.log(`Game unpaused. Was paused for approx ${durationOfPause.toFixed(2)} seconds.`);

                lastTimestamp = timeNow;         // CRUCIAL: Resets delta time calculation for the *next* frame
                gameTimeAccumulator = 0;          // CRUCIAL: Prevents the fixed-step loop from "catching up" many missed steps
                lastSpawnTime = timeNow;         // CRUCIAL: Prevent immediate spawn after a long pause

                timeWhenPauseActuallyStarted = 0; // Reset pause start time tracker

            }

        }

        // --- Score Display and Splat Functions --- provides whitespace for the score display and splat messages

        function showScoresplat(points, message) {
            // Create splat element
            const splat = document.createElement('div');
            splat.className = 'score-splat';
            splat.textContent = message + ` ${points > 0 ? '+' : ''}${points}`;
            splat.style.color = 'green'; // Default color
            splat.style.color = points > 0 ? 'green' : 'red'; // Color based on score
            splat.style.position = 'absolute';
            splat.style.zIndex = '1000'; // Ensure it appears above other content
            if (message === "START!") {
                splat.style.color = 'green'; // Default color
                splat.textContent = "START!"; // Set the text content
                splat.style.fontSize = '40px'; // Make it larger for emphasis
                splat.style.fontWeight = 'bold'; // Make it bold for emphasis
            }

            // Set position to center of the game area
            const liveGameArea = document.getElementById('gameArea');
            if (!liveGameArea) {
                console.error("liveGameArea is null, cannot position splat.");
                return; // Exit if game area is not found
            }
            // Use the liveGameArea dimensions to position the splat
            // Center the splat in the game area
            // This assumes the game area is positioned relative to the viewport

            // If you want to position it relative to a click or center, you can adjust this
            // For example, if you want it to appear at the center of the game area:
            // Position relative to click or center
            // Get the dimensions of the splat itself
            const splatWidth = splat.offsetWidth;
            const splatHeight = splat.offsetHeight;
            // Center it in the game area
            // Get the bounding rectangle of the game area

            const rect = liveGameArea.getBoundingClientRect();
            splat.style.left = `${rect.left + rect.width / 2}px`;
            splat.style.top = `${rect.top + rect.height / 2}px`;
            // Adjust for the size of the splat
            // splat.style.transform = `translate(-50%, -50%)`; // Center it by offsetting half its width and height


            // --- ANIMATION LOGIC ---
            // If a splat is already animating, do not start a new one
            if (isScoreSplatAnimating) {
                console.warn("A score splat animation is already in progress. Skipping new splat.");
                return; // Exit if a splat is already animating
            }
            isScoreSplatAnimating = true;
            console.log("Score splat started, game logic paused for animation.");

            document.body.appendChild(splat);
            // Trigger animation
            requestAnimationFrame(() => {
                splat.classList.add('show');
            });
            // Remove after animation
            setTimeout(() => {
                splat.remove();
            }, scoreSplatTimeoutSeconds * 1000);




            const initialTransform = splat.style.transform || 'translate(-50%, -50%)'; // Ensure it has a base
            const animation = splat.animate([
                { opacity: 1, transform: `${initialTransform} scale(1)` },
                { opacity: .8, transform: `${initialTransform} scale(1.5) translateY(-30px)` }
            ], {
                duration: scoreSplatTimeoutSeconds * 1000,
                easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            });

            animation.onfinish = () => {
                splat.remove();
                isScoreSplatAnimating = false;
                console.log("Score splat finished, game logic can resume (if not otherwise paused).");
                // Deactivate visual cue for this pause if you had one.
                //TODO unimplicitpause here instead of elsewere
                if( gamePaused === false ) {
                    console.log("Unpausing game after score splat animation.");
                    setPauseState(false); // Unpause the game after splat animation

                }


            };

        }




        // --- Game Element Creation ---
        // --- Game Element Creation ---
        // --- Game Element Creation (MODIFIED) ---

        function createFallingWordBox() {
            if (activeGameElements.length >= MAX_ONSCREEN_ELEMENTS) {
                return;
            }



            // Calculate initial position
            const scaledWidth = baseGroupWidth * scale;  // 100 * 3.2 = 320 units wide when scaled

            const initialX = (gameAreaViewBoxWidth / 2) - (scaledWidth / 2);  // Centers the scaled element
            const scaledHeight = baseGroupHeight * scale; // 50 * 3.2 = 160 units tall when scaled
            // Initial Y position is above the visible area
            const initialY = 0 - scaledHeight;

            // Create instance with position information
            instance1 = createInstanceFromSVGString( svg, false,false,"");
            instance1.setAttribute('transform', `translate(${initialX}, ${initialY})`);

            instance1.setAttribute('transform', `translate(${initialX}, ${initialY}) scale(${scale})`);

            instance1.setAttribute('data-word', word); // Store the word in a data attribute


            // Store in activeGameElements with necessary properties
            activeGameElements.push({
                element: instance1,
                currentY: initialY,
                currentX: initialX,
                speed: wordSpeed,// Speed at which the word box falls
                word: word,
                height: baseGroupHeight
            });
            //commented out click listener, now i use swiping like a boss
            //instance1.addEventListener('click', handleWordBoxClick); // Attach click handler
        }
        // --- Click Handler for Word Boxes ---

        // --- Game Loop Functions ---
        // ... (updateElementPositions and gameLoop remain largely the same) ...
        function updateElementPositions(deltaTime) {

        }



        const MAX_DELTA_TIME = 0.01666666667; // 100ms, your fixed time step in seconds
        // 0.01666666667 // 16.67ms, roughly 60 FPS

        function gameLoop(currentTimestamp) {
            if (!liveGameArea) {
                liveGameArea = document.getElementById('gameArea');
                if (!liveGameArea) {
                    console.error("CRITICAL: liveGameArea not found! Stopping loop.");
                    return;
                }
            }

            if (gameStopped) {
                console.log("Game is stopped. Game loop terminated.");
                return;
            }

            // Initialize lastTimestamp on the very first frame
            if (lastTimestamp === 0) {
                lastTimestamp = currentTimestamp;
                animationFrameId = requestAnimationFrame(gameLoop); // Request next frame and exit this one
                return;
            }

            let deltaTime = (currentTimestamp - lastTimestamp) / 1000; // Delta time in seconds

            // --- Handle Pausing ---
            // If game is paused, we don't update logic or lastTimestamp for delta calc.
            // We just keep requesting frames to keep the loop "alive" for when it unpauses.
            if (gamePaused) {
                if(gameStateLogs ===true)console.log("GameLoop: Game is paused. Skipping updates.");
                // When unpausing, ensure lastTimestamp is reset externally (see unpauseGame example)
                animationFrameId = requestAnimationFrame(gameLoop);
                return;
            }

            // --- Update lastTimestamp for the NEXT frame's deltaTime calculation ---
            // This should happen REGARDLESS of interaction pauses, so deltaTime is always fresh.
            lastTimestamp = currentTimestamp;

            // --- DeltaTime Sanity Check (Optional but good for extreme cases) ---
            if (deltaTime <= 0) {
                // console.warn(`GameLoop: Negative or zero deltaTime (${deltaTime}), skipping update logic for this frame.`);
                animationFrameId = requestAnimationFrame(gameLoop); // Still request next frame
                return;
            }
            // Cap deltaTime to prevent massive jumps (e.g., after tab was hidden for a long time
            // and Page Visibility API wasn't used to pause AND reset lastTimestamp)
            const MAX_POSSIBLE_DELTA_TIME = 0.5; // e.g., 500ms
            if (deltaTime > MAX_POSSIBLE_DELTA_TIME) {
                console.warn(`GameLoop: Large deltaTime (${deltaTime}) capped to ${MAX_POSSIBLE_DELTA_TIME}. Consider Page Visibility API for pausing.`);
                deltaTime = MAX_POSSIBLE_DELTA_TIME;
            }

            // --- Fixed-Step Update Loop ---
            gameTimeAccumulator += deltaTime;

            while (gameTimeAccumulator >= MAX_DELTA_TIME) {
                // Only run game logic if not paused by interaction/splat
                if (!gamePaused && !isScoreSplatAnimating) {
                    // --- Your Game Logic Updates using MAX_DELTA_TIME ---

                    gameLogic(liveGameArea); // Call your game logic function here

                    // Spawning (using direct timestamp comparison, ensure lastSpawnTime is managed with pauses)
                    // If game can pause for long, (currentTimestamp - lastSpawnTime) can be huge.
                    // Consider resetting lastSpawnTime when unpausing, or use a delta-time accumulator for spawning.
                   // if (currentTimestamp - lastSpawnTime > ELEMENT_SPAWN_INTERVAL) {
                       // createFallingWordBox();
                       // lastSpawnTime = currentTimestamp; // Reset spawn timer
                    //}

                    // Alternative Spawning (delta-time based, more robust with fixed step)
                    // timeSinceLastSpawnThisFixedStep += MAX_DELTA_TIME;
                    // if (timeSinceLastSpawnThisFixedStep >= ELEMENT_SPAWN_INTERVAL_SECONDS) {
                    // createFallingWordBox();
                    // timeSinceLastSpawnThisFixedStep = 0;
                    // }

                    //updateElementPositions(MAX_DELTA_TIME); // Pass the FIXED time step
                    //updateScoreDisplay(); // Update score display based on current game state//puts the game scroe display back on the top of the screen
                    // otherFixedStepLogic(MAX_DELTA_TIME);
                } else {
                    // Interaction pause or splat animation: Fixed-step logic is also paused.
                    // If there's any logic that should run *despite* these pauses but
                    // *during* a fixed step, it would go here. Usually, nothing does.
                }
                gameTimeAccumulator -= MAX_DELTA_TIME;
            }

            // --- Rendering (Happens every frame, uses current element states) ---
            // renderAllGameElements(); // (This would be where you draw things based on their updated positions)

            animationFrameId = requestAnimationFrame(gameLoop);
        }

        let pickleSpawned =false;
        function gameLogic(liveGameArea) {
            if(pickleSpawned === false){
                console.log("Spawning master for the first time.");
                            // Assuming createInstanceFromSVGString, liveGameArea, etc., are defined
            // and your swipe handling logic is in place (handleDocumentPointerMove, etc.)

                const newComplexAsset = createInstanceFromSVGString(
                    pickel_svgStringValue,      // The SVG content itself
                    true,                  // Add swipe listeners
                    true,                  // Assign a unique ID to the root <g>
                    'myGameAsset_'         // Prefix for the unique ID
                );

                if (newComplexAsset) {
                    liveGameArea.appendChild(newComplexAsset); // Append to the live game area
                    console.log("Successfully parsed and appended complex SVG asset:", newComplexAsset.id);
                    transformSVGElement(newComplexAsset, 100, 100, .2); // Example transform


                    // You could now further manipulate newComplexAsset if needed, e.g.,
                    // newComplexAsset.setAttribute('transform', 'translate(100, 100) scale(1.5)');
                    // Or target specific children by their ID if you know them:
                    // const label = newComplexAsset.querySelector('#assetLabel');
                    // if (label) label.textContent = "NEW_STATUS";
                } else {
                    console.error("Failed to parse the complex SVG asset.");
                }
                    pickleSpawned = true; // Set flag to true to prevent multiple spawns
                }
            // This is where you would put your game logic that needs to run every frame
            // For example, checking for collisions, updating scores, etc.
            // For now, let's just log the current score
           // console.log(`Current score: ${score}`);
            //updateElementPositions(MAX_DELTA_TIME); // Update positions of all active elements
            //uppdateScoreDisplay(); // Update score display based on current game state
        }


        function transformSVGElement(element, x, y, scaleFactor) {
    if (!element) {
        console.error("Element to transform is not defined.");
        return;
    }

    let scaleX, scaleY;
    if (typeof scaleFactor === 'object' && scaleFactor !== null && 'sx' in scaleFactor && 'sy' in scaleFactor) {
        scaleX = scaleFactor.sx;
        scaleY = scaleFactor.sy;
    } else if (typeof scaleFactor === 'number') {
        scaleX = scaleFactor;
        scaleY = scaleFactor;
    } else {
        console.warn("Invalid scaleFactor. Using scale(1,1). Provide a number or {sx, sy} object.");
        scaleX = 1;
        scaleY = 1;
    }

    // Order matters: typically scale then translate, or translate then scale affects the pivot point.
    // If you want to scale around the element's local origin (0,0) and then move it:
    const transformString = `translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`;

    // If you want to move the element's origin and then scale it around that new origin point
    // (which means the x,y in translate are also scaled if scale comes first):
    // const transformString = `scale(${scaleX}, ${scaleY}) translate(${x}, ${y})`;
    // For most "place object at x,y and set its size" scenarios, `translate` then `scale` around its local origin is common.
    // However, if your asset has its own internal origin that's not (0,0), this can get more complex.

    element.setAttribute('transform', transformString);
    console.log(`Applied transform: ${transformString} to element ID: ${element.id || 'N/A'}`);
}




        function startGame() {
             playPooledSound('jump', 'sounds/gameOver.wav');
            gamePaused = false; // Reset paused state
            if (animationFrameId === null) {
                hidePauseMenu(); // Hide pause menu if visible
                console.log("Starting new game.");
                score = 0; // Reset score
                initializeGame(); // Reset game state
                //startGame(); // Start the game loop dont do that it's recusive...!
                console.log("Starting game loop.");
                lastTimestamp = performance.now();
                animationFrameId = requestAnimationFrame((timestamp) => gameLoop(timestamp, liveGameArea));
                gameStopped = false; // Game is now running
            } else {
                console.log("Game is already running, cannot start again.");
            }

        }





// 4. Add cleanup on game stop
        function stopGame() {
            if (animationFrameId) {
                gameStopped = true; // Set game stopped flag
                gamePaused = false; // Ensure game is not paused
                console.log("Stopping game loop.");
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                console.log("Game loop stopped.");
            }

            // Clean up all active elements
            activeGameElements.forEach(elem => {
                if (elem.element) {
                    //elem.element.removeEventListener('click', handleWordBoxClick);
                    if (elem.element.parentNode) {
                        elem.element.parentNode.removeChild(elem.element);
                    }
                    elem.element = null;
                }
            });

            activeGameElements = [];
            lastTimestamp = 0;

        }

        function pauseGame() {
            timeWhenPauseActuallyStarted = performance.now();
            if (!animationFrameId) {
                console.log("Game is not running, cannot pause.");
                return; // Game is not running, do nothing
            }

            if (gamePaused) {
                console.log("Game is already paused.");
                return; // Already paused, do nothing
            }

            gamePaused = true;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null; // don't do this, this tells us the game was not running
            console.log("Game paused.");

            // Show pause menu
            const pauseMenuOverlay = document.getElementById('pauseMenuOverlay');
            if (pauseMenuOverlay) {
                pauseMenuOverlay.style.display = 'flex'; // Show pause menu
            }
        }
        function hidePauseMenu() {
            const pauseMenuOverlay = document.getElementById('pauseMenuOverlay');
            if (pauseMenuOverlay) {
                pauseMenuOverlay.style.display = 'none'; // Hide pause menu
            }
        }

        function fitSvgToScreenWithPadding(svgElement, designedWidth, designedHeight, PADDING_TOP_BOTTOM = 5) {
            if (!svgElement) {
                console.error("fitSvgToScreenWithPadding: svgElement is not defined!");
                return;
            }
            if (!designedWidth || !designedHeight) {
                console.warn("fitSvgToScreenWithPadding: designedWidth or designedHeight not provided. Attempting to use viewBox.");
                const vb = svgElement.viewBox.baseVal;
                if (vb && vb.width && vb.height) {
                    designedWidth = vb.width;
                    designedHeight = vb.height;
                } else {
                    console.error("fitSvgToScreenWithPadding: Cannot determine aspect ratio. Please set viewBox or pass designed dimensions.");
                    return;
                }
            }

            const viewportWidth = window.innerWidth;
            // Reduce available height by the total top and bottom padding
            const availableHeight = window.innerHeight - (PADDING_TOP_BOTTOM * 2);
            // Use viewportWidth as availableWidth, assuming no horizontal padding for now
            const availableWidth = viewportWidth;


            const svgAspectRatio = designedWidth / designedHeight;
            // Calculate aspect ratio of the *available space* after padding
            const availableSpaceAspectRatio = availableWidth / availableHeight;

            let newWidth, newHeight;

            if (availableSpaceAspectRatio > svgAspectRatio) {
                // Available space is wider than SVG aspect ratio
                // -> SVG height should match availableHeight, width adjusts
                newHeight = availableHeight;
                newWidth = availableHeight * svgAspectRatio;
            } else {
                // Available space is taller (or same aspect) than SVG aspect ratio
                // -> SVG width should match availableWidth, height adjusts
                newWidth = availableWidth;
                newHeight = availableWidth / svgAspectRatio;
            }

            // Ensure calculated dimensions are not negative if padding is too large
            newWidth = Math.max(0, newWidth);
            newHeight = Math.max(0, newHeight);

            svgElement.style.width = `${newWidth}px`;
            svgElement.style.height = `${newHeight}px`;

            svgElement.setAttribute('viewBox', `0 0 ${designedWidth} ${designedHeight}`);
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // Centering Logic
            // The container for this centering is effectively the viewport.
            // We want to center it within the viewport.
            // The (0,0) of the viewport is top-left.
            // top: 50% puts the element's top at the viewport's vertical midpoint.
            // transform: translateY(-50%) then shifts it up by half of ITS OWN new height.
            // This achieves perfect vertical centering in the viewport.
            // The padding is already accounted for in newHeight, so the standard centering works.

            svgElement.style.position = 'absolute';
            svgElement.style.top = '50%';
            svgElement.style.left = '50%';
            svgElement.style.transform = 'translate(-50%, -50%)';

            // No direct CSS padding on svgElement needed here because we've
            // already sized it to leave space around it.
            // If you add CSS padding to svgElement, it will be *in addition* to this.
        }

        // --- Example Usage ---
        // const liveGameArea = document.getElementById('gameArea'); // Your SVG element
        const NATIVE_SVG_WIDTH = 1600;
        const NATIVE_SVG_HEIGHT = 900;
        const PADDING_VALUE = 5; // 5px padding top and bottom

        if (liveGameArea) {
            fitSvgToScreenWithPadding(liveGameArea, NATIVE_SVG_WIDTH, NATIVE_SVG_HEIGHT, PADDING_VALUE);
            window.addEventListener('resize', () => {
                fitSvgToScreenWithPadding(liveGameArea, NATIVE_SVG_WIDTH, NATIVE_SVG_HEIGHT, PADDING_VALUE);
            });
        }

        // --- Control and Setup ---
        // ... (initializeGame, button event listeners remain the same) ...
        function resumeButtonFunc() {
            if (gamePaused) {
                console.log("Resuming game from pause.");
                gamePaused = false; // Reset paused state

                const pauseDuration = performance.now() - timeWhenPauseActuallyStarted;
                lastSpawnTime += pauseDuration;
                lastTimestamp = performance.now();
                animationFrameId = requestAnimationFrame((timestamp) => gameLoop(timestamp, liveGameArea));

                // Hide pause menu if it's visible
                hidePauseMenu();
            } else {
                console.log("Starting new game.");
                initializeGame(); // Reset game state
                startGame(); // Start the game loop
            }
        }

        function initializeGame() {
            loadSettings(); // Load settings from localStorage
            loadProgress(); // Load progress from localStorage
            updateScoreDisplay();

            // Clean up existing elements
            activeGameElements.forEach(elem => {
                if (elem.element) {
                    // Remove event listeners
                    //elem.element.removeEventListener('click', handleWordBoxClick);
                    // Remove from DOM if it exists
                    if (elem.element.parentNode) {
                        elem.element.parentNode.removeChild(elem.element);
                    }
                    // Clear reference
                    elem.element = null;
                }
            });

            // Clear array
            activeGameElements = [];
            currentWordIndex = 0;
            lastSpawnTime = performance.now();

            showScoresplat("GAME", "START!")
        }
        function showGameControls() {
            if (controlsOverlay) {
                controlsOverlay.style.visibility = 'visible'; // Make controls overlay visible
                controlsOverlay.style.display = 'block'; // Show controls overlay
            } else {
                console.error("Controls overlay not found.");
            }
        }
        function hideGameControls() {
            if (controlsOverlay) {
                controlsOverlay.style.visibility = 'hidden'; // Hide controls overlay

                controlsOverlay.style.display = 'none'; // Hide controls overlay
            } else {
                console.error("Controls overlay not found.");
            }
        }
        function showWelcomeScreen(){
            if (welcomeScreen) {
                //welcomeScreen.style.display = 'flex'; // Show welcome screen
                //welcomeScreen.style.visibility = 'visible'; // Make welcome screen visible
                welcomeBackgroundImageContainer.style.display = 'block'; // Show background image container
            } else {
                console.error("Welcome screen not found.");
            }
        }
        function hideWelcomeScreen() {
            if (welcomeScreen) {
                //welcomeScreen.style.display = 'none'; // Hide welcome screen
                //welcomeScreen.style.visibility = 'hidden'; // Hide welcome screen
                welcomeBackgroundImageContainer.style.display = 'none'; // Hide background image container
            } else {
                console.error("Welcome screen not found.");
            }
        }
        let welcomeBackgroundImageContainer = document.getElementById('welcomeBackgroundImageContainer'); // Assuming you have a container for the welcome background image
        let controlsOverlay = document.getElementById('gameControlsOverlay'); // Assuming you have a controls overlay element
        let pauseButton = document.getElementById('pauseButton');
        let welcomeScreen = document.getElementById('welcomeScreenOverlay');
        let pauseMenuOverlay = document.getElementById('pauseMenuOverlay');
        let resumeButton = document.getElementById('resumeButton');
        let startButton = document.getElementById('startGameButton');
        let quitToMenuButton = document.getElementById('quitToMenuButton'); //
        let settingsButton = document.getElementById('settingsButtonWelcome'); // Your main game's settings button
        let settingsOverlay = document.getElementById('settingsOverlay');
        let closeSettingsButton = document.getElementById('closeSettingsButton')
        // Initial Setup
        updateScoreDisplay();


// Get references to any UI elements you might use for messages
const rotateMessageOverlay = document.getElementById('rotateMessageOverlay'); // Assume you have this HTML element


        /**
 * Checks the current screen orientation and takes appropriate action.
 * This function will be our main handler.
 */
function handleOrientationChange() {
    let currentOrientation = '';
    if (screen.orientation && screen.orientation.type) {
        currentOrientation = screen.orientation.type;
        console.log(`Screen Orientation API: ${currentOrientation}`);
    } else if (window.matchMedia("(orientation: landscape)").matches) {
        currentOrientation = 'landscape-primary'; // General landscape
        console.log('MatchMedia: Landscape');
    } else if (window.matchMedia("(orientation: portrait)").matches) {
        currentOrientation = 'portrait-primary'; // General portrait
        console.log('MatchMedia: Portrait');
    } else if (typeof window.orientation !== 'undefined') {
        // Fallback to window.orientation (degrees)
        console.log(`Window.orientation (degrees): ${window.orientation}`);
        switch (window.orientation) {
            case 0:
            case 180: // Portrait or upside-down portrait
                currentOrientation = 'portrait-primary';
                break;
            case 90:
            case -90: // Landscape
                currentOrientation = 'landscape-primary';
                break;
            default:
                currentOrientation = 'unknown';
        }
    } else {
        currentOrientation = 'unknown';
        console.log('Could not determine orientation.');
    }

    // --- Your Game's Logic for Orientation ---
    // Since you prefer "sensorPortrait" and want to enforce it,
    // your primary goal here is to detect if it's NOT portrait.
    if (currentOrientation.includes('landscape')) {
        console.warn("Device is in Landscape. Game designed for Portrait.");
        if (rotateMessageOverlay) {
            rotateMessageOverlay.innerHTML = "<p>This experience is best in Portrait mode. Please rotate your device.</p>";
            rotateMessageOverlay.style.display = 'flex';
        }
        // Consider implicitly pausing game logic if it's truly unplayable or graphics break
        // if (!gamePaused) { // Assuming 'gamePaused' is your global pause flag
        //    setPauseState(true, 'orientation'); // Pass a reason if your pause system supports it
        // }
    } else if (currentOrientation.includes('portrait')) {
        console.log("Device is in Portrait. Correct orientation for the game.");
        if (rotateMessageOverlay) {
            rotateMessageOverlay.style.display = 'none';
        }
        // If you implicitly paused due to orientation, you might resume here,
        // but be careful not to override a user's explicit pause.
        // if (wasPausedByOrientation && gamePaused) {
        //    setPauseState(false, 'orientation');
        // }
    } else {
        console.log("Orientation is unknown or not strictly portrait/landscape.");
        // Decide how to handle this case, maybe hide the message.
        if (rotateMessageOverlay) {
            rotateMessageOverlay.style.display = 'none';
        }
    }
}

/**
 * Initializes orientation detection listeners.
 */
function initOrientationDetection() {
    console.log("Initializing JavaScript orientation detection...");

    // 1. Modern approach: screen.orientation API
    if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
        screen.orientation.addEventListener('change', () => {
            console.log("Event: screen.orientation 'change'");
            handleOrientationChange();
        });
        console.log("Attached listener to screen.orientation 'change'.");
    } else {
        // 2. Fallback: matchMedia for orientation
        const landscapeMatcher = window.matchMedia("(orientation: landscape)");
        if (typeof landscapeMatcher.addEventListener === 'function') {
            landscapeMatcher.addEventListener('change', (e) => {
                console.log(`Event: matchMedia '(orientation: landscape)' changed. Matches: ${e.matches}`);
                handleOrientationChange();
            });
            console.log("Attached listener to matchMedia '(orientation: landscape)'.");
            // Note: You might also want to listen to "(orientation: portrait)" changes
            // if the landscape one doesn't fire reliably on all transitions back to portrait.
            // However, usually one is sufficient as handleOrientationChange checks both.
        } else if (typeof window.addEventListener === 'function') {
            // 3. Older fallback: 'orientationchange' event on window
            window.addEventListener('orientationchange', () => {
                console.log("Event: window 'orientationchange'");
                handleOrientationChange();
            }, false);
            console.log("Attached listener to window 'orientationchange'.");
        } else {
            console.warn("Could not attach any reliable orientation change listeners.");
        }
    }

    // Perform an initial check when the script loads
    console.log("Performing initial orientation check.");
    handleOrientationChange();
}





function showAndroidToast() {
    if (typeof AndroidBridge !== "undefined" && AndroidBridge !== null) {
        // We are likely in the Android WebView with the bridge
        var message = "Hello from JavaScript! 👋";
        AndroidBridge.showToast(message);
        console.log("Called AndroidBridge.showToast('" + message + "')");
    } else {
        // We are likely NOT in the Android WebView, or bridge isn't ready
        console.warn("AndroidBridge is not defined. Toast functionality skipped.");
        // Optionally, provide a fallback or do nothing silently:
        // alert("Toast feature is only available in the app.");
    }
}

function vibrateDevicePattern() {
    if (typeof AndroidBridge !== "undefined" && AndroidBridge !== null) {
        var pattern = "0,200,100,400";
        AndroidBridge.vibrateWithPattern(pattern);
        console.log("Called AndroidBridge.vibrateWithPattern('" + pattern + "')");
    } else {
        console.warn("AndroidBridge is not defined. Vibration functionality skipped.");
        // Optionally, hide the button or provide feedback:
        // document.getElementById('vibrateButton').style.display = 'none';
        // alert("Vibration is only available in the app.");
    }
}










//// --- DOMContentLoaded Event Listener ---

document.addEventListener('DOMContentLoaded', () => {


            //load in pause ui

            // Get references to your new UI elements.. refetch them if needed

            // most importantly liveGameArea = document.getElementById('gameArea'); // Re-fetch
            welcomeBackgroundImageContainer = document.getElementById('welcomeBackgroundImageContainer'); // Assuming you have a container for the welcome background image
            liveGameArea = document.getElementById('gameArea'); // Re-fetch the game area SVG element
            quitToMenuButton = document.getElementById('quitToMenuButton'); // Assuming you have a quit button in the pause menu
            controlsOverlay = document.getElementById('gameControlsOverlay'); // Assuming you have a controls overlay element
            pauseButton = document.getElementById('pauseButton');
            welcomeScreen = document.getElementById('welcomeScreenOverlay');
            pauseMenuOverlay = document.getElementById('pauseMenuOverlay');
            resumeButton = document.getElementById('resumeButton');
            settingsButton = document.getElementById('settingsButtonWelcome'); // Your main game's settings button
            settingsOverlay = document.getElementById('settingsOverlay');
            closeSettingsButton = document.getElementById('closeSettingsButton')

            startButton = document.getElementById('startGameButton');

            if (startButton) {
                startButton.addEventListener('click', () => {
                    if (animationFrameId) {
                        console.log("Game is already running, cannot start again.");
                    } else {
                        console.log("Starting new game.");
                        //initializeGame(); // Reset game state
                        hideWelcomeScreen();
                        showGameControls();
                        hidePauseMenu(); // Hide pause menu if visible
                        startGame(); // Start the game loop
                    }
                });
            }





            // ... get other buttons from pause menu as needed ...

            // --- Event Listeners ---

            if (pauseButton) {
                //pause button click handler
                pauseButton.addEventListener('click', () => {

                    if (animationFrameId && (gamePaused === false)) {// running, so we can pause

                        console.log("Pause button clicked, pausing game.");
                        pauseGame(); // Call the pause function
                    } else {

                    }
                });
            }


            if (resumeButton) {
                resumeButton.addEventListener('click', () => {

                    resumeButtonFunc();// Call the resume function

                });
            }

            if (quitToMenuButton) {




                quitToMenuButton.addEventListener('click', () => {

                    if(gamePaused === true){
                        console.log("Quit to menu button clicked, stopping game.");
                        console.log("Stop button clicked, stopping game.");
                        stopGame(); // Call the stop function
                        hideGameControls();
                        hidePauseMenu(); // Hide pause menu if visible
                        showWelcomeScreen(); // Show welcome screen
                        // Reset game state
                    }

                });




            }



            // Option 2: Define the designed dimensions
            const NATIVE_SVG_WIDTH = 408; // The width your SVG was designed at
            const NATIVE_SVG_HEIGHT = 718; // The height your SVG was designed at
            const PADDING_VALUE = 5; // 5px padding top and bottom
            if (liveGameArea) { // Make sure liveGameArea (your SVG element) exists
                fitSvgToScreenWithPadding(liveGameArea, NATIVE_SVG_WIDTH, NATIVE_SVG_HEIGHT), PADDING_VALUE;
                window.addEventListener('resize', () => {
                    fitSvgToScreenWithPadding(liveGameArea, NATIVE_SVG_WIDTH, NATIVE_SVG_HEIGHT, PADDING_VALUE);
                });
            }




            //settings button click handler

            // --- Event Listeners for showing/hiding ---
            if (settingsButton && settingsOverlay) {
                settingsButton.addEventListener('click', () => {
                    loadSettings(); // Load current settings into UI elements
                    settingsOverlay.classList.remove('hidden');
                    // If you were using display: none; you'd do:
                    settingsOverlay.style.display = 'flex'; // or 'block' depending on its default display
                    console.log("Settings button clicked, showing settings overlay.");
                });
            }

            if (closeSettingsButton && settingsOverlay) {
                closeSettingsButton.addEventListener('click', () => {
                    updateSettingsFromUI();
                    saveSettings();
                    applyGameSettings();
                    settingsOverlay.classList.add('hidden');
                    // If you were using display: none; you'd do:
                     settingsOverlay.style.display = 'none';
                });
            }




















            initOrientationDetection(); // Initialize orientation detection
            vibrateDevicePattern();






        });




