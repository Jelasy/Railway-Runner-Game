// ==========================================
// Main Application Entry Point
// ==========================================
import * as THREE from 'three';
import { GameEngine } from './game/game.js';

// Expose THREE globally for any addon or debug access
window.THREE = THREE;

window.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine();
  game.start();
});
