// Utilidades de data, formatação e DOM.

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad = (n) => String(n).padStart(2, '0');

// Permite simular data/hora para testes: ?now=2026-11-21T21:00
let offset = 0;
try {
  const p = new URLSearchParams(location.search).get('now');
  if (p) {
    const t = new Date(p);
    if (!isNaN(t)) offset = t.getTime() - Date.now();
  }
} catch { /* ignore */ }
export const now = () => new Date(Date.now() + offset);
export const nowMs = () => Date.now() + offset;

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(now());
export function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
export function diffDays(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number); const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
export const dow = (s) => parseYmd(s).getDay();

export const DOW = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const DOW_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const fmtLong = (s) => { const d = parseYmd(s); return `${cap(DOW[d.getDay()])}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
export const fmtShort = (s) => { const d = parseYmd(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const num = (n, dec = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const mmss = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600); const mm = Math.floor((sec % 3600) / 60); const ss = sec % 60; return h ? `${h}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`; };
export const minutesOfDay = (d = now()) => d.getHours() * 60 + d.getMinutes();
export const hm = (t) => { const [h, mi] = t.split(':').map(Number); return h * 60 + mi; };

export const parseNum = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : null; };

// ---------- Feedback: som e vibração ----------
let ctx;
export function unlockAudio() {
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { /* sem áudio */ }
}
export function beep(times = 3, freq = 880) {
  try {
    unlockAudio(); if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = freq; o.type = 'sine';
      const t0 = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.22);
    }
  } catch { /* ignore */ }
}
export function buzz(pattern = [300, 120, 300]) { try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* ignore */ } }

let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* ignore */ }
}
