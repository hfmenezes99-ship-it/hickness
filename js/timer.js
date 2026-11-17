// Cronômetros: aeróbico (tela cheia, com troca de ritmo) e descanso entre séries.
import { cardioPlan } from './data.js';
import { state, save, getDay } from './store.js';
import { esc, mmss, nowMs, beep, buzz, unlockAudio, keepAwake } from './util.js';
import { ACT, rerender, confirmSheet } from './ui.js';

const TYPE_LABEL = { run: 'Corra', walk: 'Ande', z2: 'Zona 2', core: 'Core' };

// ---------- Aeróbico ----------
export function startCardio(date, type, week) {
  const plan = cardioPlan(type, week);
  unlockAudio();
  state.timer = {
    date, type, title: plan.title, mode: plan.mode, segs: plan.segs, goal: plan.goal || '',
    alerts: plan.alerts || [], startTs: nowMs(), pausedAt: null, pausedTotal: 0, lastIdx: 0, fired: [],
  };
  const d = getDay(date);
  d.cardio = { ...(d.cardio || {}), type, startedAt: Date.now() };
  save(); beep(1, 660); buzz(150);
  keepAwake(true); mountOverlay(); ensureTick();
}

const elapsedSec = (t) => ((t.pausedAt ?? nowMs()) - t.startTs - t.pausedTotal) / 1000;
const totalSec = (t) => t.segs.reduce((a, s) => a + s.sec, 0);

function segAt(t, el) {
  let acc = 0;
  for (let i = 0; i < t.segs.length; i++) { if (el < acc + t.segs[i].sec) return { i, left: acc + t.segs[i].sec - el, seg: t.segs[i] }; acc += t.segs[i].sec; }
  return { i: t.segs.length, left: 0, seg: null };
}

function finishCardio(manual) {
  const t = state.timer; if (!t) return;
  const el = elapsedSec(t);
  const d = getDay(t.date);
  d.cardio = d.cardio || { type: t.type };
  d.cardio.time = Math.round(el / 60);
  d.cardio.timerDone = true;
  if (!manual || t.mode === 'stopwatch') d.cardio.checks = { ...(d.cardio.checks || {}), z2: true, core: true };
  state.timer = null; save();
  keepAwake(false);
  beep(4, 990); buzz([400, 150, 400, 150, 600]);
  showDone(t, el);
  rerender();
}

let overlay;
function mountOverlay() {
  if (!overlay) { overlay = document.createElement('div'); overlay.id = 'timer'; document.body.appendChild(overlay); }
  const t = state.timer;
  overlay.className = 'show';
  overlay.innerHTML = `
    <div class="tm-top"><span>${esc(t.title)}</span><span id="tm-total"></span></div>
    <div class="tm-main">
      <div id="tm-label" class="tm-label"></div>
      <div id="tm-hint" class="tm-hint"></div>
      <div id="tm-clock" class="tm-clock">0:00</div>
      <div id="tm-round" class="tm-round"></div>
      <div class="bar big"><i id="tm-bar"></i></div>
      <div id="tm-next" class="tm-next"></div>
    </div>
    <div class="tm-actions">
      <button class="btn big" data-act="tm-pause" id="tm-pause">Pausar</button>
      <button class="btn big ${t.mode === 'stopwatch' ? 'primary' : 'ghost'}" data-act="tm-stop">${t.mode === 'stopwatch' ? 'Terminei' : 'Encerrar'}</button>
    </div>`;
  paint();
}

function showDone(t, el) {
  if (!overlay) return;
  overlay.className = 'show done';
  overlay.innerHTML = `<div class="tm-main"><div class="tm-label">Concluído</div><div class="tm-clock">${mmss(el)}</div>
    <p class="tm-hint">Registre a distância e o tempo.</p></div>
    <div class="tm-actions"><button class="btn big primary" data-act="tm-close">Registrar</button></div>`;
}

function paint() {
  const t = state.timer; if (!t || !overlay) return;
  const el = elapsedSec(t);
  const $ = (id) => overlay.querySelector('#' + id);
  $('tm-pause').textContent = t.pausedAt ? 'Retomar' : 'Pausar';
  overlay.classList.toggle('paused', !!t.pausedAt);
  if (t.mode === 'stopwatch') {
    overlay.dataset.type = 'run';
    $('tm-label').textContent = t.type === 'walk' ? 'Caminhada' : 'Corra';
    $('tm-hint').textContent = t.goal ? `Meta: ${t.goal}` : '';
    $('tm-clock').textContent = mmss(el);
    $('tm-round').textContent = '';
    $('tm-next').textContent = '';
    $('tm-total').textContent = '';
    $('tm-bar').style.width = '0';
    return;
  }
  const tot = totalSec(t); const cur = segAt(t, el);
  if (!cur.seg) return;
  overlay.dataset.type = cur.seg.type;
  $('tm-label').textContent = TYPE_LABEL[cur.seg.type] || cur.seg.label;
  $('tm-hint').textContent = cur.seg.hint || cur.seg.label;
  $('tm-clock').textContent = mmss(cur.left);
  $('tm-round').textContent = cur.seg.round ? `Bloco ${cur.seg.round}` : '';
  const nx = t.segs[cur.i + 1];
  $('tm-next').textContent = nx ? `Depois: ${nx.label} ${mmss(nx.sec)}` : 'Último trecho';
  $('tm-total').textContent = `${mmss(el)} / ${mmss(tot)}`;
  $('tm-bar').style.width = `${(el / tot) * 100}%`;
}

function tickCardio() {
  const t = state.timer; if (!t || t.pausedAt) return;
  const el = elapsedSec(t);
  if (t.mode === 'stopwatch') {
    for (const a of t.alerts) if (el >= a && !t.fired.includes(a)) { t.fired.push(a); save(); beep(2); buzz([300, 100, 300]); }
  } else {
    const cur = segAt(t, el);
    if (!cur.seg) return finishCardio(false);
    if (cur.i !== t.lastIdx) {
      const prev = t.segs[t.lastIdx];
      t.lastIdx = cur.i;
      if (prev?.type === 'z2') { const d = getDay(t.date); d.cardio.checks = { ...(d.cardio.checks || {}), z2: true }; }
      save();
      // padrão de vibração distinto: correr = longo, andar = curtos
      if (cur.seg.type === 'run') { buzz([700, 200, 700]); beep(3, 990); } else { buzz([200, 100, 200, 100, 200]); beep(2, 620); }
    }
  }
  paint();
}

ACT['tm-pause'] = () => {
  const t = state.timer; if (!t) return;
  if (t.pausedAt) { t.pausedTotal += nowMs() - t.pausedAt; t.pausedAt = null; keepAwake(true); } else { t.pausedAt = nowMs(); }
  save(); paint();
};
ACT['tm-stop'] = () => {
  const t = state.timer; if (!t) return;
  if (t.mode === 'stopwatch') return finishCardio(true);
  confirmSheet('Encerrar agora?', 'O tempo feito até aqui fica registrado.', 'Encerrar', () => finishCardio(true));
};
ACT['tm-close'] = () => { if (overlay) overlay.className = ''; location.hash = '#treino'; rerender(); };

// ---------- Descanso entre séries ----------
let rest = null; let restEl;
export function startRest(sec, label) {
  unlockAudio();
  rest = { end: nowMs() + sec * 1000, total: sec, label };
  if (!restEl) { restEl = document.createElement('div'); restEl.id = 'rest'; document.body.appendChild(restEl); }
  restEl.className = 'show';
  restEl.innerHTML = `<div class="rest-info"><span class="mut small">Descanso${label ? ` · ${esc(label)}` : ''}</span><b id="rest-clock"></b></div>
    <button class="btn small" data-act="rest-add">+30 s</button><button class="btn small ghost" data-act="rest-skip">Pular</button>
    <div class="bar thin"><i id="rest-bar"></i></div>`;
  paintRest(); ensureTick();
}
export const stopRest = () => { rest = null; if (restEl) restEl.className = ''; };
function paintRest() {
  if (!rest || !restEl) return;
  const left = (rest.end - nowMs()) / 1000;
  restEl.querySelector('#rest-clock').textContent = mmss(Math.ceil(left));
  restEl.querySelector('#rest-bar').style.width = `${Math.max(0, (left / rest.total) * 100)}%`;
}
function tickRest() {
  if (!rest) return;
  if (nowMs() >= rest.end) {
    rest = null; beep(3, 880); buzz([400, 150, 400]);
    restEl.className = 'show go';
    restEl.innerHTML = '<div class="rest-info"><b>Bora! Próxima série</b></div><button class="btn small ghost" data-act="rest-skip">OK</button>';
    setTimeout(() => { if (!rest && restEl) restEl.className = ''; }, 5000);
    return;
  }
  paintRest();
}
ACT['rest-add'] = () => { if (rest) { rest.end += 30000; rest.total += 30; paintRest(); } };
ACT['rest-skip'] = () => stopRest();

// ---------- Loop ----------
let ticking = null;
function ensureTick() {
  if (ticking) return;
  ticking = setInterval(() => {
    tickCardio(); tickRest();
    if (!state.timer && !rest) { clearInterval(ticking); ticking = null; }
  }, 250);
}

export function resumeTimers() {
  if (state.timer) { keepAwake(!state.timer.pausedAt); mountOverlay(); ensureTick(); }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.timer && !state.timer.pausedAt) { keepAwake(true); tickCardio(); }
});
