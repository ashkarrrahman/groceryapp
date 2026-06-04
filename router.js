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
  if (!fn) return;
  // Error boundary: a throwing screen must not leave the user staring at a
  // blank app (all screens deactivated). Show a minimal recovery screen.
  try {
    fn();
  } catch (e) {
    console.error('Screen render failed for', path, e);
    renderError(e);
  }
}

function renderError(e) {
  let host = $('#screen-welcome') || document.querySelector('.screen');
  if (!host) return;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  host.classList.add('active');
  host.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'empty-state';
  box.innerHTML = '<h2>Something went wrong</h2>'
    + '<p class="muted">The screen failed to load. Your saved data is safe.</p>';
  const btn = document.createElement('button');
  btn.className = 'btn-primary';
  btn.textContent = 'Reload app';
  btn.addEventListener('click', () => location.reload());
  box.appendChild(btn);
  host.appendChild(box);
}

window.addEventListener('hashchange', render);
