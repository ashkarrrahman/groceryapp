// Hash-based router. Screen render functions are registered by main.js to keep
// this module free of screen imports (no circular dependencies).
import { $ } from './dom.js';

let routes = {};

export function setRoutes(map) { routes = map; }

export function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return routes[h] ? h : '/';
}

export function navigate(path) {
  if (location.hash !== '#' + path) location.hash = path;
  else render();
}

export function setScreen(id) {
  const node = $('#' + id);
  node.classList.add('active');
  return node;
}

export function render() {
  const path = currentPath();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const fn = routes[path] || routes['/'];
  if (fn) fn();
}

window.addEventListener('hashchange', render);
