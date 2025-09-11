import * as globals from './globals.js';
import { assetManager } from './AssetManager.js';
import { LevelManager } from './LevelManager.js';
import * as input from './input.js';
import { handleTilemapCollisions, getTileIdAtTileCoords, TILE_SIZE, TILE_PROPERTIES } from './tileMapManagement.js';
import { setVolume, playPooledSound } from './audioManagement.js';
import { loadSettings, loadProgress, saveProgress, saveSettings, updateSettingsFromUI, applyGameSettings, applyGameProgress, populateSettingsUI, addListenersForSettingsUI } from './settingsManagement.js';
import { createPicklePlayerInstance } from './PickleMan.js';
import { createPatrolingChef } from './ChefEnemy.js';
import { Collectable } from './Collectable.js'; // Added Collectable import
import { Camera } from './Camera.js';
import * as gameState from './gameState.js';
import { TilemapRenderer } from './TilemapRenderer.js';
import { BackgroundManager } from './BackgroundManager.js'; // Added
import { TILE_CONFIG } from './globals.js';
import { Logger } from './logger.js';

Logger.setLogLevel(Logger.LEVELS.INFO);
globals.debugMode(false);
Logger.always('AppInit', 'Application Core Initialized.');

const levelManager = new LevelManager(); // Instance of LevelManager
const backgroundManager = new BackgroundManager(); // Added
let tilemapRenderer = null;
export let player;
export function setPlayer(newPlayer) { player = newPlayer; }
export let canvas = null;
export let ctx = null;
window.camera = null;

let activeGameElements = [];
export let animationFrameId = null;
export let gameTimeAccumulator = 0;
export let timeWhenPauseActuallyStarted = 0;
export let lastTimestamp = 0;
export let score = 0;

let assetsToLoadCount = 0;
let assetsSuccessfullyLoadedCount = 0;
let assetsFailedToLoadCount = 0;

let welcomeScreenButtons = [];
let levelSelectScreenButtons = []; // For buttons on the level select screen
let mousePos = { x: 0, y: 0 };
let isGameReadyToStart = false;

class CanvasButton {
    constructor(x, y, width, height, text, onClick, options = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.text = text;
        this.onClick = onClick;
        this.isHovered = false;

        this.colors = {
            normal: options.normalColor || '#007bff',
            hover: options.hoverColor || '#0056b3',
            disabled: options.disabledColor || '#cccccc',
            text: options.textColor || '#ffffff'
        };
        this.fontSize = options.fontSize || 20;
        this.fontFamily = options.fontFamily || 'Arial';
    }

    isMouseOver(currentMousePos) {
        return currentMousePos.x >= this.x && currentMousePos.x <= this.x + this.width &&
               currentMousePos.y >= this.y && currentMousePos.y <= this.y + this.height;
    }

    draw(ctx, currentMousePos, isEnabled = true) {
        this.isHovered = isEnabled && this.isMouseOver(currentMousePos);
        let currentBgColor = this.colors.normal;
        if (!isEnabled) {
            currentBgColor = this.colors.disabled;
        } else if (this.isHovered) {
            currentBgColor = this.colors.hover;
        }

        ctx.fillStyle = currentBgColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = this.colors.text;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
    }

    triggerClick(isEnabled = true) {
        if (isEnabled && this.onClick && typeof this.onClick === 'function') {
            this.onClick();
        }
    }
}

function initializeCoreGameSystems() {
    const gameWorldWidth = 10000;
    const gameWorldHeight = 10000;
    window.camera = new Camera(0, 0, globals.nativeGameWidth, globals.nativeGameHeight, gameWorldWidth, gameWorldHeight);
    Logger.info("[Main.js] Camera initialized.");
}

function singleAssetProcessed(key, error) {
    if (error) {
        assetsFailedToLoadCount++;
        Logger.error(`[Main.js] Failed to load asset: "${key}". Error: ${error.message || error}. Total FAILED: ${assetsFailedToLoadCount}`);
    } else {
        assetsSuccessfullyLoadedCount++;
        Logger.info(`[Main.js] Successfully loaded asset: "${key}". Total SUCCESSFUL: ${assetsSuccessfullyLoadedCount}`);
    }
}

async function loadPrerequisitesAndEnableStart() {
    Logger.info("[Main.js] Asset loading complete. Now loading level manifest...");
    const manifestLoaded = await levelManager.loadManifest('levels/levels-manifest.json');
    if (!manifestLoaded) {
        Logger.error("[Main.js] CRITICAL: Level manifest failed to load.");
        proceedToGameStartConditionCheck(); return;
    }
    Logger.info("[Main.js] Level manifest loaded. Now pre-loading default level data...");
    const firstLevelDataLoaded = await levelManager.loadDefaultLevel();
    if (!firstLevelDataLoaded) {
        Logger.error("[Main.js] CRITICAL: Failed to pre-load default level data.");
        proceedToGameStartConditionCheck(); return;
    }
    Logger.info("[Main.js] Default level data pre-loaded successfully.");
    proceedToGameStartConditionCheck();
}

function allAssetsProcessed() {
    loadPrerequisitesAndEnableStart();
}

function proceedToGameStartConditionCheck() {
    if (uiElements.loadingMessage) uiElements.loadingMessage.style.display = 'none';

    if (assetsFailedToLoadCount > 0) {
        const errorMessage = `Failed to load ${assetsFailedToLoadCount} essential game file(s). Please refresh.`;
        Logger.error(`CRITICAL: ${errorMessage}`);
        displayAssetLoadError(errorMessage);
        isGameReadyToStart = false;
    } else if (assetsSuccessfullyLoadedCount >= assetsToLoadCount && levelManager.isManifestLoaded() && levelManager.getCurrentLevelData()) {
        Logger.info("All prerequisites loaded successfully! Ready for user to start.");
        if (uiElements.gameLoadError) uiElements.gameLoadError.style.display = 'none';
        isGameReadyToStart = true;
        if (canvas && (canvas.width < 10 || canvas.height < 10)) {
            Logger.warn("[proceedToGameStartConditionCheck] Canvas size was small when buttons might have been created. Consider re-init.");
        }
        initializeWelcomeScreenButtons(); 

    } else {
        Logger.warn("[proceedToGameStartConditionCheck] Prerequisites not yet met.");
        isGameReadyToStart = false;
    }
}

async function startGame() {
    gameState.setWelcomeScreenActive(false);
    Logger.info("%c[Main.js] startGame() CALLED!", "color: green; font-weight:bold;");

    hideWelcomeScreenHtml(); 
    if (uiElements.gameLoadError) uiElements.gameLoadError.style.display = 'none';
    
    showGameControlsOverlay();
    playPooledSound('jump', 'sounds/gameOver.wav');

    const initialLevelData = levelManager.getCurrentLevelData(); 
    if (!initialLevelData) {
        Logger.error("CRITICAL: Initial level data missing in startGame. Attempting to load default.");
        const defaultLoaded = await levelManager.loadDefaultLevel();
        if (!defaultLoaded) {
            displayAssetLoadError("Error: Could not retrieve any level data.");
            gameState.setWelcomeScreenActive(true); 
            return;
        }
    }
    setupSceneFromLevelData(levelManager.getCurrentLevelData()); 

    gameState.setGamePaused(false);
    gameState.setGameStopped(false);
    if (animationFrameId === null) {
        lastTimestamp = performance.now();
        gameTimeAccumulator = 0;
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        lastTimestamp = performance.now(); 
        gameTimeAccumulator = 0;
    }
    Logger.info(`[Main.js startGame] Game initialized. Starting game loop.`);
}

function setupSceneFromLevelData(levelData) {
    Logger.info("[Main.js] Setting up scene from level data:", levelData);
    activeGameElements = [];
    backgroundManager.loadLevelBackgrounds(levelData, assetManager); 

    if (levelData.playerStart) {
        tilemapRenderer = new TilemapRenderer(levelData.tilemap, TILE_CONFIG);
        player = createPicklePlayerInstance(levelData.playerStart.x, levelData.playerStart.y, "pickle_player_idle", globals.default_scale, globals.default_player_health, globals.default_player_speed, tilemapRenderer);
        activeGameElements.push(player);
        if (window.camera) window.camera.follow(player);
    } else {
        Logger.error("No playerStart defined in level data!");
    }
    if (levelData.enemies && Array.isArray(levelData.enemies)) {
        levelData.enemies.forEach(enemyInfo => {
            if (enemyInfo.type === "chef_patrol") {
                const chef = createPatrolingChef(enemyInfo.x, enemyInfo.y, "cheff_ketchup_walk", globals.default_scale, enemyInfo.health || 100, enemyInfo.speed || 80, enemyInfo.patrolMinX, enemyInfo.patrolMaxX, tilemapRenderer);
                activeGameElements.push(chef);
            }
        });
    }

    if (levelData.collectibles && Array.isArray(levelData.collectibles)) {
        levelData.collectibles.forEach(collectibleInfo => {
            if (collectibleInfo.type && typeof collectibleInfo.x === 'number' && typeof collectibleInfo.y === 'number') {
                const collectable = new Collectable(collectibleInfo.x, collectibleInfo.y, collectibleInfo.type, globals.default_scale);
                activeGameElements.push(collectable);
                Logger.info(`[Main.js] Created collectable: ${collectibleInfo.type} at (${collectibleInfo.x}, ${collectibleInfo.y})`);
            } else {
                Logger.warn("[Main.js] Invalid collectible data in level:", collectibleInfo);
            }
        });
    }

    if (levelData.tilemap && window.camera && tilemapRenderer) {
        const mapW = tilemapRenderer.getMapWidth();
        const mapH = tilemapRenderer.getMapHeight();
        window.camera.setWorldSize(mapW, mapH);
    } else {
        tilemapRenderer = null;
        if(window.camera) window.camera.setWorldSize(globals.nativeGameWidth, globals.nativeGameHeight);
    }
    input.initInput();
    hidePauseMenu();
    score = 0;
}

function displayAssetLoadError(message) {
    if (uiElements && uiElements.gameLoadError) {
        uiElements.gameLoadError.textContent = message;
        uiElements.gameLoadError.style.display = 'block';
    } else {
        alert("Error loading game: " + message);
    }
}

let uiElements = {
    welcomeScreen: null,
    startGameButton: null,
    loadingMessage: null,
    gameLoadError: null
};

document.addEventListener("visibilitychange", () => {
    if (gameState.gameStopped && !gameState.welcomeScreenActive) {
        Logger.trace("[VisibilityChange] Game is stopped. No action."); return;
    }
    if (document.hidden) {
        if (animationFrameId && !gameState.gamePaused && !gameState.welcomeScreenActive) {
            Logger.info("Page hidden or focus lost. Auto-pausing game.");
            pauseGame();
        }
    } else {
        Logger.info("Page became visible. Game remains paused if auto-paused.");
    }
});

function setPauseState(pause) {
    gameState.setGamePaused(pause);
    if (pause) {
        timeWhenPauseActuallyStarted = performance.now();
    } else {
        lastTimestamp = performance.now();
        gameTimeAccumulator = 0;
        timeWhenPauseActuallyStarted = 0;
    }
}

const MAX_DELTA_TIME = 1 / 60;

function prepareLevelSelectScreen() {
    levelSelectScreenButtons = []; 
    // --- MODIFICATION START: Added detailed logging for canvas dimensions ---    
    Logger.info(`[prepareLevelSelectScreen] Checking canvas. Canvas exists: ${!!canvas}. Canvas width: ${canvas?.width}, height: ${canvas?.height}`);
    // --- MODIFICATION END ---
    if (!canvas || canvas.width < 10 || canvas.height < 10) { 
        Logger.warn("[prepareLevelSelectScreen] Canvas not ready or too small for level select screen prep.");
        return;
    }
    const availableLevels = levelManager.getAvailableLevels();

    if (!availableLevels || availableLevels.length === 0) {
        Logger.warn("[Main.js] No levels available to display in selector.");
    } else {
        const buttonWidth = Math.min(canvas.width * 0.6, 350); 
        const buttonHeight = Math.min(canvas.height * 0.08, 50);
        const totalButtonHeight = availableLevels.length * (buttonHeight + 10) - 10; 
        let startY = (canvas.height - totalButtonHeight) / 2; 
        startY = Math.max(startY, canvas.height * 0.15); 

        availableLevels.forEach((level, index) => {
            const levelName = level.name || level.id || `Level ${index + 1}`;
            levelSelectScreenButtons.push(new CanvasButton(
                canvas.width / 2 - buttonWidth / 2,
                startY + index * (buttonHeight + 10), 
                buttonWidth,
                buttonHeight,
                levelName,
                async () => { 
                    Logger.info(`[Main.js] Level selected: ${level.id}`);
                    const loaded = await levelManager.loadLevel(level.id);
                    if (loaded) {
                        gameState.setWelcomeView('main'); 
                        startGame(); 
                    } else {
                        Logger.error(`[Main.js] Failed to load selected level: ${level.id}`);
                    }
                },
                { fontSize: Math.min(buttonHeight * 0.4, 20), normalColor: '#17a2b8', hoverColor: '#138496' } 
            ));
        });
    }

    const backButtonWidth = Math.min(canvas.width * 0.3, 150);
    const backButtonHeight = Math.min(canvas.height * 0.07, 40);
    levelSelectScreenButtons.push(new CanvasButton(
        canvas.width / 2 - backButtonWidth / 2,
        canvas.height * 0.88, 
        backButtonWidth,
        backButtonHeight,
        "Back",
        () => {
            Logger.info("[Main.js] Back from level select to main welcome.");
            gameState.setWelcomeView('main');
        },
        { fontSize: Math.min(backButtonHeight * 0.4, 18), normalColor: '#6c757d', hoverColor: '#5a6268' } 
    ));
}

function drawWelcomeScreenUI(ctx) {
    if (!canvas || !ctx || canvas.width < 10 || canvas.height < 10) {
        return;
    }

    ctx.fillStyle = '#2c3e50'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (gameState.welcomeView === 'main') {
        ctx.fillStyle = '#ecf0f1'; 
        ctx.font = `bold ${Math.min(canvas.width / 15, 48)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText("Pickle Man's Big Adventure!", canvas.width / 2, canvas.height * 0.2);
        ctx.restore(); 

        welcomeScreenButtons.forEach(button => {
            if (button.text === "Start Game") {
                button.draw(ctx, mousePos, isGameReadyToStart);
            } else {
                button.draw(ctx, mousePos, true); 
            }
        });
         if (!isGameReadyToStart && assetsFailedToLoadCount === 0 && (uiElements.loadingMessage?.style.display === 'block' || !levelManager.isManifestLoaded() || !levelManager.getCurrentLevelData())) {
            ctx.save();
            ctx.fillStyle = '#f39c12'; 
            ctx.font = `${Math.min(canvas.width / 25, 20)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText("Loading Game Assets...", canvas.width / 2, canvas.height * 0.75);
            ctx.restore();
        }

    } else if (gameState.welcomeView === 'levelSelect') {
        ctx.fillStyle = '#ecf0f1';
        ctx.font = `bold ${Math.min(canvas.width / 18, 40)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText("Select Level", canvas.width / 2, canvas.height * 0.1);
        ctx.restore(); 

        levelSelectScreenButtons.forEach(button => {
            button.draw(ctx, mousePos, true); 
        });
    }
}

function gameLoop(currentTimestamp) {
    if (!animationFrameId && !gameState.welcomeScreenActive && gameState.gameStopped) {
        Logger.info("[gameLoop] Exiting: animationFrameId is null, game is stopped and not on welcome screen.");
        return;
    }

    if (!lastTimestamp) lastTimestamp = currentTimestamp;
    let deltaTime = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    if (!ctx) { 
        Logger.error("[gameLoop] ctx is not valid. Cannot clear or draw.");
        if (animationFrameId) animationFrameId = requestAnimationFrame(gameLoop); 
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState.welcomeScreenActive) {
        drawWelcomeScreenUI(ctx);
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    if (gameState.gameStopped) {
        Logger.info("[gameLoop] Game is stopped. Not updating or drawing game elements.");
        animationFrameId = null; 
        return;
    }

    deltaTime = Math.min(deltaTime, MAX_DELTA_TIME * 5); 

    if (!gameState.gamePaused) {
        gameTimeAccumulator += deltaTime;
        while (gameTimeAccumulator >= MAX_DELTA_TIME) {
            if (window.camera) window.camera.update();
            updateGameElements(MAX_DELTA_TIME, currentTimestamp);
            gameTimeAccumulator -= MAX_DELTA_TIME;
        }
    }

    if (backgroundManager && window.camera) {
        ctx.save();
        ctx.translate(globals.sceneState.currentOffsetX, globals.sceneState.currentOffsetY);
        ctx.scale(globals.sceneState.currentScale, globals.sceneState.currentScale);
        backgroundManager.draw(ctx, window.camera);
        ctx.restore();
    }

    ctx.save();
    ctx.translate(globals.sceneState.currentOffsetX, globals.sceneState.currentOffsetY);
    ctx.scale(globals.sceneState.currentScale, globals.sceneState.currentScale);
    if (window.camera) {
        ctx.translate(Math.round(-window.camera.x), Math.round(-window.camera.y));
    }
    if (tilemapRenderer && window.camera) {
        tilemapRenderer.draw(ctx, window.camera, { bufferTiles: 2 });
    }
    activeGameElements.forEach(element => {
        if (element && typeof element.draw === 'function') element.draw(ctx, window.camera);
    });
    ctx.restore();

    if (globals.DEBUG_MODE && window.camera && typeof window.camera.drawDeadZoneDebug === 'function') {
        window.camera.drawDeadZoneDebug(ctx, globals.sceneState.currentScale, globals.sceneState.currentOffsetX, globals.sceneState.currentOffsetY);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}


function updateGameElements(deltaTime, currentTime) {
    let elementsToKeep = [];
    let activeCollectables = []; 

    activeGameElements.forEach(element => {
        if (element.isActive) {
            element.update(deltaTime, currentTime, activeGameElements);
            if (element.isActive) { 
                elementsToKeep.push(element);
                if (element.entityType && element.entityType === 'collectable') { 
                    activeCollectables.push(element);
                }
            }
        }
    });

    if (player && player.isActive && activeCollectables.length > 0) {
        activeCollectables.forEach(collectable => {
            if (player.x < collectable.x + collectable.width &&
                player.x + player.width > collectable.x &&
                player.y < collectable.y + collectable.height &&
                player.y + player.height > collectable.y) {
                
                collectable.onCollect(player);
            }
        });
    }
    activeGameElements = elementsToKeep.filter(el => el.isActive);
}


function stopGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    gameState.setGameStopped(true);
    gameState.setGamePaused(false);
    gameState.setWelcomeScreenActive(true);
    gameState.setWelcomeView('main'); 
    Logger.info("Game stopped. Transitioning to Welcome Screen (main view).");

    input.removeInputListeners();
    activeGameElements = [];
    tilemapRenderer = null;
    player = null;

    hideGameControlsOverlay();
    hidePauseMenu();
    initializeWelcomeScreenButtons(); 

    if (!animationFrameId) {
      lastTimestamp = performance.now();
      animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function pauseGame() {
    if (gameState.gameStopped || !animationFrameId || gameState.welcomeScreenActive) {
        Logger.info("Game not pausable (stopped, not running, or on welcome screen)."); return;
    }
    if (gameState.gamePaused) { Logger.info("Game already paused."); return; }
    setPauseState(true);
    Logger.info("Game paused by pauseGame function.");
    if (globals.pauseMenuOverlay) globals.pauseMenuOverlay.style.display = 'flex';
}

function showGameControlsOverlay() {
    const overlay = document.getElementById('gameControlsOverlay');
    if (overlay) overlay.classList.add('visible');
    else Logger.warn("[Main.js] showGameControlsOverlay: 'gameControlsOverlay' not found.");
}

function hideGameControlsOverlay() {
    const overlay = document.getElementById('gameControlsOverlay');
    if (overlay) overlay.classList.remove('visible');
    else Logger.warn("[Main.js] hideGameControlsOverlay: 'gameControlsOverlay' not found.");
}

function hidePauseMenu() {
    if (globals.pauseMenuOverlay) globals.pauseMenuOverlay.style.display = 'none';
}

function resumeButtonFunc() {
    if (gameState.gamePaused && !gameState.gameStopped && !gameState.welcomeScreenActive) {
        Logger.info("Resuming game from pause menu.");
        setPauseState(false);
        hidePauseMenu();
    }
}

function showWelcomeScreenHtml() { 
    hideGameControlsOverlay();
    hidePauseMenu();
}

function hideWelcomeScreenHtml() {}
 
function initializeWelcomeScreenButtons() {
    if (!canvas || canvas.width < 10 || canvas.height < 10) { 
        Logger.warn("[initializeWelcomeScreenButtons] Canvas not ready or too small. Deferring button creation.");
        return;
    }
    Logger.info(`[initializeWelcomeScreenButtons] Initializing with canvas size: ${canvas.width}x${canvas.height}`);
    welcomeScreenButtons = []; 

    const buttonWidth = Math.min(canvas.width * 0.4, 250);
    const buttonHeight = Math.min(canvas.height * 0.1, 60);
    const centerX = canvas.width / 2;

    welcomeScreenButtons.push(new CanvasButton(
        centerX - buttonWidth / 2, canvas.height * 0.45, buttonWidth, buttonHeight,
        "Start Game",
        () => {
            Logger.info("Canvas 'Start Game' button clicked.");
            if(isGameReadyToStart) {
                startGame(); 
            }
            else Logger.info("Start Game clicked, but not ready yet.");
        },
        { fontSize: Math.min(buttonHeight * 0.4, 24) }
    ));

    welcomeScreenButtons.push(new CanvasButton(
        centerX - buttonWidth / 2, canvas.height * 0.60, buttonWidth, buttonHeight,
        "Level Select",
        () => {
            Logger.info("Canvas 'Level Select' button clicked.");
            prepareLevelSelectScreen(); 
            gameState.setWelcomeView('levelSelect'); 
        },
        { normalColor: '#28a745', hoverColor: '#218838', fontSize: Math.min(buttonHeight * 0.4, 24) }
    ));

    welcomeScreenButtons.push(new CanvasButton(
        centerX - buttonWidth / 2, canvas.height * 0.75, buttonWidth, buttonHeight, 
        "Settings",
        () => { 
            Logger.info("Canvas 'Settings' button clicked.");
            const openSettingsFunc = document.getElementById('settingsButtonWelcome')?.onclick || (() => {
                 loadSettings(); populateSettingsUI(); globals.settingsOverlay?.classList.add('visible');
            });
            if (typeof openSettingsFunc === 'function') openSettingsFunc();
        },
        { normalColor: '#ffc107', hoverColor: '#e0a800', fontSize: Math.min(buttonHeight * 0.4, 24) }
    ));
    Logger.info(`[initializeWelcomeScreenButtons] Created ${welcomeScreenButtons.length} buttons.`);
}

function resizeCanvasAndCalculateScale() {
    Logger.info(`[resizeCanvasAndCalculateScale] Called.`);
    if (!canvas) { 
        Logger.error("[resizeCanvasAndCalculateScale] Canvas not found for resize."); 
        return; 
    }
    
    const currentWindowInnerWidth = window.innerWidth;
    const currentWindowInnerHeight = window.innerHeight;
    Logger.info(`[resizeCanvasAndCalculateScale] window.innerWidth = ${currentWindowInnerWidth}, window.innerHeight = ${currentWindowInnerHeight}`);

    if (currentWindowInnerWidth < 10 || currentWindowInnerHeight < 10) { 
        Logger.warn(`[resizeCanvasAndCalculateScale] window.innerWidth or window.innerHeight is too small (${currentWindowInnerWidth}x${currentWindowInnerHeight}). Aborting resize to prevent 0x0 canvas. Will rely on subsequent resize event.`);
        return; 
    }

    canvas.width = currentWindowInnerWidth;
    canvas.height = currentWindowInnerHeight;
    Logger.info(`[resizeCanvasAndCalculateScale] Set canvas.width = ${canvas.width}, canvas.height = ${canvas.height}`);

    if (gameState.welcomeScreenActive) {
        Logger.info("[resizeCanvasAndCalculateScale] Welcome screen is active, re-initializing buttons for new canvas size.");
        initializeWelcomeScreenButtons();
        prepareLevelSelectScreen(); 
    }

    let screenAspectRatio = canvas.width / canvas.height;
    if (screenAspectRatio > globals.nativeGameAspectRatio) {
        globals.sceneState.currentScale = canvas.height / globals.nativeGameHeight;
        globals.sceneState.currentOffsetX = (canvas.width - (globals.nativeGameWidth * globals.sceneState.currentScale)) / 2;
        globals.sceneState.currentOffsetY = 0;
    } else {
        globals.sceneState.currentScale = canvas.width / globals.nativeGameWidth;
        globals.sceneState.currentOffsetX = 0;
        globals.sceneState.currentOffsetY = (canvas.height - (globals.nativeGameHeight * globals.sceneState.currentScale)) / 2;
    }
    Logger.info(`[resizeCanvasAndCalculateScale] Calculated globals.sceneState.currentScale = ${globals.sceneState.currentScale}`);
    Logger.info(`[resizeCanvasAndCalculateScale] OffsetX = ${globals.sceneState.currentOffsetX}, OffsetY = ${globals.sceneState.currentOffsetY}`);
}

function handleGlobalKeyDown(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) return;

    switch (event.key) {
        case 'Escape':
            if (globals.settingsOverlay?.classList.contains('visible')) {
                document.getElementById('closeSettingsButton')?.click();
            } else if (gameState.welcomeScreenActive) {
                if (gameState.welcomeView === 'levelSelect') {
                    gameState.setWelcomeView('main'); 
                } else {
                    Logger.info("[Keyboard] Escape on Main Welcome Screen. No specific action.");
                }
            } else if (!gameState.gameStopped) {
                if (gameState.gamePaused) resumeButtonFunc(); else pauseGame();
            }
            event.preventDefault();
            break;
        case 'Enter':
            if (gameState.welcomeScreenActive && gameState.welcomeView === 'main' && isGameReadyToStart) {
                 if (!(globals.settingsOverlay?.classList.contains('visible'))) {
                    Logger.info("[Keyboard] Enter on Main Welcome Screen. Starting game.");
                    startGame(); 
                } else {
                    Logger.info("[Keyboard] Enter on Welcome, but settings open. No action.");
                }
            } else if (gameState.welcomeScreenActive && !isGameReadyToStart) {
                Logger.info("[Keyboard] Enter on Welcome, but game not ready to start.");
            } else if (gameState.welcomeScreenActive && gameState.welcomeView === 'levelSelect') {
                Logger.info("[Keyboard] Enter on Level Select screen. No specific action (use mouse/touch).");
            }
            if(gameState.welcomeScreenActive) event.preventDefault();
            break;
    }
}

function handleCanvasMouseMove(event) {
    if (!canvas) return; 
    const rect = canvas.getBoundingClientRect();
    // Scale mouse coordinates to match canvas's internal resolution
    mousePos.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mousePos.y = (event.clientY - rect.top) * (canvas.height / rect.height);
}

function handleCanvasClick(event) {
    if (!canvas || !gameState.welcomeScreenActive) return; 

    let buttonsToCheck = [];
    if (gameState.welcomeView === 'main') {
        buttonsToCheck = welcomeScreenButtons;
    } else if (gameState.welcomeView === 'levelSelect') {
        buttonsToCheck = levelSelectScreenButtons;
    }

    buttonsToCheck.forEach(button => {
        if (button.isMouseOver(mousePos)) {
            if (button.text === "Start Game") {
                button.triggerClick(isGameReadyToStart);
            } else {
                button.triggerClick(true); 
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeCoreGameSystems();
    canvas = document.getElementById('gameArea');
    if (canvas) {
        ctx = canvas.getContext('2d');
        window.addEventListener('resize', resizeCanvasAndCalculateScale, false);
        resizeCanvasAndCalculateScale(); 

        canvas.addEventListener('mousemove', handleCanvasMouseMove); 
        canvas.addEventListener('click', handleCanvasClick);
    } else {
        Logger.error("CRITICAL: Canvas element 'gameArea' not found."); return;
    }

    uiElements.loadingMessage = document.getElementById('loadingMessage');
    uiElements.gameLoadError = document.getElementById('gameLoadError');

    if (uiElements.loadingMessage) {
        uiElements.loadingMessage.style.display = 'block';
    }

    globals.setWelcomeBackgroundImageContainer?.(document.getElementById('welcomeBackgroundImageContainer'));
    globals.setControlsOverlay?.(document.getElementById('gameControlsOverlay'));
    globals.setPauseButton?.(document.getElementById('pauseButton'));
    globals.setPauseMenuOverlay?.(document.getElementById('pauseMenuOverlay'));
    globals.setResumeButton?.(document.getElementById('resumeButton'));
    globals.setQuitToMenuButton?.(document.getElementById('quitToMenuButton'));
    globals.setSettingsOverlay?.(document.getElementById('settingsOverlay'));
    globals.setRotateMessageOverlay?.(document.getElementById('rotateMessageOverlay'));

    document.getElementById('pauseButton')?.addEventListener('click', () => {
        if (animationFrameId && !gameState.gamePaused && !gameState.gameStopped && !gameState.welcomeScreenActive) pauseGame();
    });
    document.getElementById('resumeButton')?.addEventListener('click', resumeButtonFunc);
    document.getElementById('quitToMenuButton')?.addEventListener('click', () => {
        if (!gameState.welcomeScreenActive && (gameState.gamePaused || (animationFrameId && !gameState.gameStopped)) ) {
            stopGame();
        }
    });

    function openSettings() {
        loadSettings(); populateSettingsUI();
        globals.settingsOverlay?.classList.add('visible');
        Logger.info("Settings shown.");
    }
    document.getElementById('settingsButton')?.addEventListener('click', openSettings);
    
    document.getElementById('closeSettingsButton')?.addEventListener('click', () => {
        updateSettingsFromUI(); saveSettings(); applyGameSettings();
        globals.settingsOverlay?.classList.remove('visible');
    });

    addListenersForSettingsUI();
    document.addEventListener('keydown', handleGlobalKeyDown);

    const assetsManifest = [
        { key: globals.MASTER_SPRITE_SHEET_KEY, type: 'masterSpriteSheet', jsonPath: globals.SPRITE_SHEET_JSON_PATH, imagePath: globals.SPRITE_SHEET_PATH },
        { key: 'bg_sky_calm', type: 'image', path: 'images/backgrounds/sky_calm.png' },
        { key: 'bg_mountains_distant', type: 'image', path: 'images/backgrounds/mountains_distant.png' },
        { key: 'bg_forest_close', type: 'image', path: 'images/backgrounds/forest_close.png' },
        { key: 'bg_clouds_fast', type: 'image', path: 'images/backgrounds/clouds_fast.png' }
    ];

    if (!assetsManifest || assetsManifest.length === 0) {
        Logger.warn("Asset manifest empty. Proceeding.");
        assetsToLoadCount = 0; assetsSuccessfullyLoadedCount = 0; assetsFailedToLoadCount = 0;
        loadPrerequisitesAndEnableStart(); 
    } else {
        await processManifest(assetsManifest, singleAssetProcessed, allAssetsProcessed); 
    }

    if (welcomeScreenButtons.length === 0) {
        Logger.info("DOMContentLoaded: Assets processed or manifest empty. Attempting late button initialization if needed.");
        initializeWelcomeScreenButtons();
    }

    if (!animationFrameId) {
        Logger.info("DOMContentLoaded: Starting main game loop (will show welcome screen).");
        lastTimestamp = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
});

export async function processManifest(manifest, progressCallback, completionCallback) {
    Logger.info(`%c[processManifest START]`, "color: green; font-weight: bold;");
    let loadedCount = 0, failedCount = 0;
    assetsToLoadCount = manifest.length;
    assetsSuccessfullyLoadedCount = 0; assetsFailedToLoadCount = 0;

    for (const asset of manifest) {
        let currentAssetKey = asset.key || "UNKNOWN_KEY";
        try {
            if (!asset.key || !asset.type) throw new Error(`Asset missing key or type: ${JSON.stringify(asset)}`);
            let loadedAssetData = null;
            if (asset.type === "masterSpriteSheet") {
                if (!asset.jsonPath || !asset.imagePath) throw new Error(`MasterSpriteSheet "${currentAssetKey}" missing paths.`);
                await assetManager.loadMasterSpriteSheet(asset.jsonPath, asset.imagePath, currentAssetKey);
                loadedAssetData = assetManager.getMasterSheetImage();
            } else if (asset.type === "image") {
                if (!asset.path) throw new Error(`Image "${currentAssetKey}" missing path.`);
                loadedAssetData = await assetManager.loadImage(currentAssetKey, asset.path);
            } else if (asset.type === "audio") {
                loadedAssetData = `Audio data for ${currentAssetKey}`;
            } else {
                throw new Error(`Unknown asset type: ${asset.type}`);
            }
            loadedCount++;
            if (progressCallback) progressCallback(currentAssetKey, null, loadedAssetData, loadedCount + failedCount, assetsToLoadCount);
        } catch (error) {
            failedCount++;
            Logger.error(`[processManifest] ERROR for asset "${currentAssetKey}":`, error.message);
            if (progressCallback) progressCallback(currentAssetKey, error, null, loadedCount + failedCount, assetsToLoadCount);
        }
    }
    if (completionCallback) completionCallback(loadedCount, failedCount, assetsToLoadCount);
    Logger.info(`%c[processManifest END]`, "color: green; font-weight: bold;");
}
