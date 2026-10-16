// ==========================================
// Utility Functions for 3D Runner Game
// ==========================================
import * as THREE from 'three';

/**
 * Shorthand helper to get element by ID
 */
export const $ = (id) => document.getElementById(id);

/**
 * Generate random float between a and b
 */
export const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * Pick a random element from an array
 */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Read JSON data safely from LocalStorage
 */
export function read(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item === null ? defaultValue : JSON.parse(item);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Save JSON data safely to LocalStorage
 */
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Ignore storage quota or disabled errors
  }
}

/**
 * Display a temporary floating notice on screen
 */
let notifyTimer = null;
export function notify(text) {
  const el = $('notice');
  if (!el) return;
  el.textContent = text;
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    el.textContent = '';
  }, 1000);
}

/**
 * Synthesize retro sound effects using Web Audio API
 */
let audioCtx = null;
export function playSound(startFreq = 440, endFreq = 700, isMuted = false) {
  if (isMuted) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.12);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(t + 0.14);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

/**
 * Create a Three.js sprite displaying an emoji
 */
export function spriteEmoji(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = '90px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 68);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.3, 1.3, 1);
  return sprite;
}
