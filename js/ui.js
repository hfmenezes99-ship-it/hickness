// Infra de UI: ações delegadas, re-render, folha inferior (sheet), toast e ícones.
import { esc } from './util.js';

export const ACT = {};    // data-act="nome" -> fn(el, ev)
export const INPUT = {};  // data-input="nome" -> fn(el, ev) (input e change)
export const CHANGE = {}; // data-change="nome" -> fn(el, ev) (só change)

let renderFn = () => {};
export const setRender = (fn) => { renderFn = fn; };
export const rerender = () => renderFn();

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el, ev); }
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-input]');
  if (el && INPUT[el.dataset.input]) INPUT[el.dataset.input](el, ev);
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-change]');
  if (el && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el, ev);
});

// ---------- Sheet ----------
export function openSheet(html, onMount) {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  onMount && onMount(wrap.querySelector('.sheet'));
  return wrap;
}
export function closeSheet() { document.querySelectorAll('.sheet-wrap').forEach((w) => w.remove()); }

// ---------- Toast ----------
let toastTimer;
export function toast(msg, action) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { action.fn(); t.classList.remove('show'); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? 4500 : 2200);
}

export function confirmSheet(title, text, okLabel, onOk) {
  openSheet(`<h2>${esc(title)}</h2>${text ? `<p class="mut">${esc(text)}</p>` : ''}
    <button class="btn primary" data-ok>${esc(okLabel)}</button>
    <button class="btn ghost" data-close>Cancelar</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => { onOk(); closeSheet(); };
  });
}

// ---------- Componentes ----------
export const bar = (v, max, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.min(100, Math.max(0, (v / (max || 1)) * 100)).toFixed(1)}%"></i></div>`;
export const check = (on) => `<span class="ck ${on ? 'on' : ''}" aria-hidden="true">${on ? ICON.check : ''}</span>`;

export const ICON = {
  check: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  hoje: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
  dieta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4.5-3.5 8h3.5"/></svg>',
  treino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/></svg>',
  metas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  drop: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2.5c-3.5 4.6-6.5 8.3-6.5 11.8a6.5 6.5 0 0013 0c0-3.5-3-7.2-6.5-11.8z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
