// ./entityManager.js

let players = [];
let enemies = [];
let projectiles = [];
let particles = [];
// ... other entity types

// --- Adding Entities ---
export function addPlayer(player) {
    players.push(player);
}
export function addEnemy(enemy) {
    enemies.push(enemy);
}
export function addProjectile(projectile) {
    projectiles.push(projectile);
}
// ... and so on

// --- Removing Entities ---
// (Could be by ID, by reference, or have systems to mark for removal and sweep)
export function removePlayer(player) {
    players = players.filter(p => p !== player);
}
export function removeEnemy(enemy) {
    enemies = enemies.filter(e => e !== enemy);
}
// ...

// --- Accessing Entities (Getters) ---
export function getPlayers() {
    return [...players]; // Return a copy to prevent external modification of the array itself
}
export function getEnemies() {
    return [...enemies];
}
export function getAllProjectiles() {
    return [...projectiles];
}

// --- Iteration for Updates/Drawing (Often called by main.js) ---
export function updateAll(deltaTime, currentTime) {
    // Order can matter (e.g., players update before enemies, projectiles update first)
    [...projectiles].forEach(p => {
        if (p.isActive) p.update(deltaTime, currentTime);
        else removeProjectile(p); // Example of cleanup
    });
    [...players].forEach(p => {
        if (p.isActive) p.update(deltaTime, currentTime);
        else removePlayer(p);
    });
    [...enemies].forEach(e => {
        if (e.isActive) e.update(deltaTime, currentTime);
        else removeEnemy(e);
    });
    // ...
}

export function drawAll(ctx) {
    // Order can matter for rendering layers
    enemies.forEach(e => e.isActive && e.draw(ctx));
    players.forEach(p => p.isActive && p.draw(ctx));
    projectiles.forEach(p => p.isActive && p.draw(ctx));
    // ...
}

export function clearAllEntities() {
    players = [];
    enemies = [];
    projectiles = [];
    particles = [];
}
