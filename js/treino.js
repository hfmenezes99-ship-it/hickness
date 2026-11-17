// Aba Treino: musculação (checklist + séries + descanso) e aeróbicos.
import { EXERCISES, WORKOUTS, WEEK_GUIDE, WARMUP, CLOSING, SHOULDER_SWAPS, cardioPlan } from './data.js';
import { state, save, getDay, peekDay, proto, workoutId, plannedWorkout } from './store.js';
import { esc, num, fmtLong, fmtShort, today, dow, parseNum, mmss } from './util.js';
import { ACT, INPUT, CHANGE, rerender, openSheet, closeSheet, toast, check, ICON, confirmSheet } from './ui.js';
import { startCardio, startRest, stopRest } from './timer.js';

// ---------- Helpers ----------
export function exList(wid) {
  const w = WORKOUTS[wid];
  return w.ex.map((id) => (state.settings.shoulderSwap && SHOULDER_SWAPS[id]) || id);
}
export const setsFor = (ex, week) => (week === 1 ? 3 : ex.sets);
export const repsText = (ex) => {
  const [a, b] = ex.reps;
  if (ex.unit === 's') return `${a} s`;
  return `${a === b ? a : `${a}–${b}`}${ex.perSide ? ' por perna' : ''}`;
};

export function lastLog(exId, before) {
  const dates = Object.keys(state.days).filter((d) => d < before).sort().reverse();
  for (const d of dates) {
    const s = state.days[d].workout?.sets?.[exId];
    if (s && s.some((x) => x.done)) return { date: d, sets: s.filter((x) => x.done) };
  }
  return null;
}

const cardioBase = (wid) => (wid === 'run' ? 'run' : wid === 'z2' ? 'z2' : 'walk');
export const cardioType = (date) => {
  const wid = workoutId(date);
  return peekDay(date)?.cardio?.type === 'brisk' && wid === 'run' ? 'brisk' : cardioBase(wid);
};

export function workoutSummary(date) {
  const wid = workoutId(date); const w = WORKOUTS[wid]; const p = proto(date);
  const d = peekDay(date);
  if (w.kind === 'forca') {
    const done = !!d?.workout?.done;
    return { wid, name: w.name, sub: `${exList(wid).length} exercícios · ${WEEK_GUIDE[p.week - 1].rir}`, done, started: !!d?.workout };
  }
  const type = cardioType(date);
  const plan = cardioPlan(type, p.week);
  return { wid, name: type === 'brisk' ? 'Caminhada rápida' : (wid === 'run' ? plan.title : w.name), sub: plan.desc, done: !!d?.cardio?.done, started: !!d?.cardio };
}

const W = (date) => {
  const d = getDay(date);
  if (!d.workout) d.workout = { type: workoutId(date), warm: {}, close: {}, sets: {}, done: false };
  return d.workout;
};

// ---------- Ações: musculação ----------
ACT['wk-check'] = (el) => {
  const w = W(el.dataset.date); const grp = w[el.dataset.grp]; grp[el.dataset.id] = !grp[el.dataset.id]; save(); rerender();
};
INPUT['set-val'] = (el) => {
  const w = W(el.dataset.date); const arr = (w.sets[el.dataset.ex] ||= []);
  const s = (arr[+el.dataset.i] ||= { kg: null, reps: null, done: false });
  s[el.dataset.f] = parseNum(el.value); save();
};
ACT['set-done'] = (el) => {
  const { date, ex, i } = el.dataset; const idx = +i;
  const w = W(date); const arr = (w.sets[ex] ||= []);
  const s = (arr[idx] ||= { kg: null, reps: null, done: false });
  s.done = !s.done;
  if (s.done) {
    // preenche com o valor sugerido se ficou vazio
    const row = el.closest('.set');
    const kgIn = row.querySelector('[data-f="kg"]'); const rIn = row.querySelector('[data-f="reps"]');
    if (s.kg == null && kgIn && kgIn.dataset.sug) s.kg = parseNum(kgIn.dataset.sug);
    if (s.reps == null && rIn && rIn.dataset.sug) s.reps = parseNum(rIn.dataset.sug);
    const exDef = EXERCISES[ex];
    const p = proto(date);
    const list = exList(w.type);
    const lastOfAll = list[list.length - 1] === ex && idx === setsFor(exDef, p.week) - 1;
    if (!lastOfAll) startRest(exDef.comp ? state.settings.restCompound : state.settings.restOther, exDef.name);
    else stopRest();
  }
  save(); rerender();
};
ACT['wk-finish'] = (el) => {
  const w = W(el.dataset.date); w.done = !w.done; save(); stopRest(); rerender();
  if (w.done) toast('Treino concluído');
};
ACT['shoulder'] = (el) => {
  state.shoulderLog.push({ date: el.dataset.date, at: Date.now() });
  save();
  openSheet(`<h2>Ombro doeu · registrado</h2>
    <p>Sugestão para os próximos treinos:</p>
    <ul class="items"><li>Desenvolvimento → <b>elevação lateral</b></li><li>Supino reto → <b>supino inclinado com halteres</b></li></ul>
    <p class="mut small">Pegada neutra, descer controlado. Se doer, pare o exercício.</p>
    <button class="btn primary" data-ok>Aplicar trocas</button>
    <button class="btn ghost" data-close>Agora não</button>`, (s) => {
    s.querySelector('[data-ok]').onclick = () => { state.settings.shoulderSwap = true; save(); closeSheet(); rerender(); toast('Trocas de ombro ativas'); };
  });
};
ACT['shoulder-off'] = () => confirmSheet('Ombro ok?', 'Volta ao supino reto e ao desenvolvimento.', 'Voltar ao normal', () => { state.settings.shoulderSwap = false; save(); rerender(); });
CHANGE['override'] = (el) => {
  const d = getDay(el.dataset.date);
  if (el.value === plannedWorkout(el.dataset.date)) delete d.override; else d.override = el.value;
  if (d.workout && d.workout.type !== workoutId(el.dataset.date) && !d.workout.done && !Object.keys(d.workout.sets).length) d.workout = null;
  save(); rerender();
};
INPUT['weight'] = (el) => {
  const v = parseNum(el.value);
  if (v && v > 30 && v < 250) state.weights[el.dataset.date] = v; else delete state.weights[el.dataset.date];
  save();
};

// ---------- Ações: aeróbico ----------
const C = (date) => { const d = getDay(date); d.cardio ||= { type: cardioType(date) }; d.cardio.checks ||= {}; return d.cardio; };
ACT['cardio-start'] = (el) => startCardio(el.dataset.date, cardioType(el.dataset.date), proto(el.dataset.date).week);
ACT['cardio-check'] = (el) => { const c = C(el.dataset.date); c.checks[el.dataset.id] = !c.checks[el.dataset.id]; save(); rerender(); };
ACT['cardio-brisk'] = (el) => { const c = C(el.dataset.date); c.type = c.type === 'brisk' ? 'run' : 'brisk'; save(); rerender(); };
INPUT['cardio-val'] = (el) => { const c = C(el.dataset.date); c[el.dataset.f] = parseNum(el.value); save(); };
ACT['cardio-done'] = (el) => { const c = C(el.dataset.date); c.done = !c.done; save(); rerender(); if (c.done) toast('Aeróbico registrado'); };

// ---------- Render ----------
function exCard(exId, date, week, w) {
  const ex = EXERCISES[exId];
  const n = setsFor(ex, week);
  const logged = w?.sets?.[exId] || [];
  const last = lastLog(exId, date);
  const top = ex.reps[1];
  const bump = week >= 3 && last && last.sets.length >= n && last.sets.every((s) => (s.reps || 0) >= top);
  const sugKg = last ? last.sets[last.sets.length - 1].kg : null;
  const allDone = Array.from({ length: n }, (_, i) => logged[i]?.done).every(Boolean);
  const rest = ex.comp ? state.settings.restCompound : state.settings.restOther;
  const rows = Array.from({ length: n }, (_, i) => {
    const s = logged[i] || {};
    const ls = last?.sets[i] || last?.sets[last.sets.length - 1];
    const finalHard = week === 4 && ex.comp && i === n - 1;
    const a = `data-date="${date}" data-ex="${exId}" data-i="${i}"`;
    return `<div class="set ${s.done ? 'done' : ''}">
      <span class="sn">${i + 1}</span>
      ${ex.bw ? '<span class="bw">peso corporal</span>' : `<label class="inp"><input data-input="set-val" data-f="kg" ${a} inputmode="decimal" value="${s.kg ?? ''}" placeholder="${ls?.kg ?? 'kg'}" data-sug="${ls?.kg ?? ''}"><span>kg</span></label>`}
      <label class="inp"><input data-input="set-val" data-f="reps" ${a} inputmode="numeric" value="${s.reps ?? ''}" placeholder="${ls?.reps ?? repsText(ex).replace(' por perna', '')}" data-sug="${ls?.reps ?? ''}"><span>${ex.unit === 's' ? 's' : 'reps'}</span></label>
      <button class="setck" data-act="set-done" ${a} aria-label="Série ${i + 1} feita">${check(s.done)}</button>
      ${finalHard ? '<span class="hard">0–1 RIR</span>' : ''}
    </div>`;
  }).join('');
  return `<section class="card ex ${allDone ? 'is-done' : ''}">
    <div class="ex-h"><h3>${esc(ex.name)}</h3>${allDone ? `<span class="okmark">${ICON.check}</span>` : ''}</div>
    <div class="ex-plan"><b>${n} × ${repsText(ex)}</b> · descanso ${mmss(rest)}${ex.comp ? ' · composto' : ''}</div>
    ${last ? `<div class="ex-last">Última (${fmtShort(last.date)}): ${last.sets.map((s) => `${ex.bw ? '' : `${num(s.kg ?? 0, s.kg % 1 ? 1 : 0)} kg × `}${s.reps ?? '–'}`).join(' · ')}</div>` : ''}
    ${bump ? '<div class="bump">↑ Bateu o topo em todas: suba a carga</div>' : ''}
    ${ex.note ? `<div class="ex-note">${esc(ex.note)}</div>` : ''}
    <div class="sets">${rows}</div>
  </section>`;
}

function checklist(title, items, grp, date, done) {
  return `<section class="card"><h3>${title}</h3>
    ${items.map((it) => `<button class="checkrow" data-act="wk-check" data-grp="${grp}" data-id="${it.id}" data-date="${date}">${check(done[it.id])}<span>${esc(it.label)}</span></button>`).join('')}
  </section>`;
}

function overrideSelect(date) {
  const cur = workoutId(date); const planned = plannedWorkout(date);
  return `<section class="card"><label class="mut small" for="ovr">Trocar o treino de hoje</label>
    <select id="ovr" data-change="override" data-date="${date}">
      ${Object.entries(WORKOUTS).map(([id, w]) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(w.name)}${id === planned ? ' (planejado)' : ''}</option>`).join('')}
    </select></section>`;
}

function renderForca(date, wid, p) {
  const w = peekDay(date)?.workout;
  const guide = WEEK_GUIDE[p.week - 1];
  const ex = exList(wid);
  const upper = wid === 'supA' || wid === 'supB';
  const monday = dow(date) === 1;
  return `
    <section class="card guide"><div class="pill">Semana ${p.week} · ${guide.rir}</div><p>${guide.text}</p></section>
    ${state.settings.shoulderSwap ? `<section class="card warnbox"><b>Trocas de ombro ativas.</b> <button class="link" data-act="shoulder-off">Ombro ok?</button></section>` : ''}
    ${checklist('Aquecimento', WARMUP, 'warm', date, w?.warm || {})}
    ${ex.map((id) => exCard(id, date, p.week, w)).join('')}
    ${upper ? `<button class="btn warn" data-act="shoulder" data-date="${date}">Ombro doeu</button>` : ''}
    <section class="card"><h3>Fechamento</h3>
      ${CLOSING.map((it) => `<button class="checkrow" data-act="wk-check" data-grp="close" data-id="${it.id}" data-date="${date}">${check(w?.close?.[it.id])}<span>${esc(it.label)}</span></button>`).join('')}
      ${monday ? `<div class="field inline"><label>Peso em jejum (segunda)</label><label class="inp wide"><input data-input="weight" data-date="${date}" inputmode="decimal" value="${state.weights[date] ?? ''}" placeholder="79,0"><span>kg</span></label></div>` : ''}
    </section>
    <button class="btn big ${w?.done ? '' : 'primary'}" data-act="wk-finish" data-date="${date}">${w?.done ? 'Treino concluído ✓ (desfazer)' : 'Concluir treino'}</button>
  `;
}

function renderCardio(date, wid, p) {
  const type = cardioType(date);
  const plan = cardioPlan(type, p.week);
  const c = peekDay(date)?.cardio || {};
  const running = state.timer && state.timer.date === date;
  const total = plan.segs.reduce((a, s) => a + s.sec, 0);
  return `
    <section class="card">
      <h3>${esc(plan.title)}</h3>
      <p>${esc(plan.desc)}</p>
      ${plan.mode === 'segments' ? `<p class="mut small">Total ${Math.round(total / 60)} min · vibra e apita a cada troca de ritmo.</p>` : `<p class="mut small">Cronômetro crescente${plan.goal ? ` · meta ${plan.goal}` : ''}.</p>`}
      <button class="btn big primary" data-act="${running ? 'noop' : 'cardio-start'}" data-date="${date}" ${running ? 'disabled' : ''}>${ICON.play} ${c.timerDone ? 'Começar de novo' : 'Começar'}</button>
      ${wid === 'run' && !plan.test ? `<button class="btn ghost" data-act="cardio-brisk" data-date="${date}">${type === 'brisk' ? 'Voltar para a corrida' : 'Pernas pesadas? Trocar por caminhada rápida de 45 min'}</button>` : ''}
    </section>
    ${plan.checks.length ? `<section class="card"><h3>Checklist</h3>${plan.checks.map((it) => `<button class="checkrow" data-act="cardio-check" data-id="${it.id}" data-date="${date}">${check(c.checks?.[it.id])}<span>${esc(it.label)}</span></button>`).join('')}</section>` : ''}
    <section class="card"><h3>Registro</h3>
      <div class="grid2">
        <div class="field"><label>Distância</label><label class="inp wide"><input data-input="cardio-val" data-f="dist" data-date="${date}" inputmode="decimal" value="${c.dist ?? ''}" placeholder="${plan.test ? '5,0' : '0,0'}"><span>km</span></label></div>
        <div class="field"><label>Tempo total</label><label class="inp wide"><input data-input="cardio-val" data-f="time" data-date="${date}" inputmode="numeric" value="${c.time ?? ''}" placeholder="${plan.mode === 'segments' ? Math.round(total / 60) : '0'}"><span>min</span></label></div>
      </div>
    </section>
    <button class="btn big ${c.done ? '' : 'primary'}" data-act="cardio-done" data-date="${date}">${c.done ? 'Feito ✓ (desfazer)' : 'Marcar como feito'}</button>
  `;
}

export function renderTreino() {
  const date = today(); const p = proto(date);
  const wid = workoutId(date); const w = WORKOUTS[wid];
  return `
    <header class="top">
      <div class="date">${fmtLong(date)}</div>
      <h1>${esc(workoutSummary(date).name)}</h1>
    </header>
    ${w.kind === 'forca' ? renderForca(date, wid, p) : renderCardio(date, wid, p)}
    ${overrideSelect(date)}
  `;
}
