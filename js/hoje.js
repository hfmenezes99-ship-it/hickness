// Aba Hoje: cabeçalho do protocolo, card "Agora", treino do dia e resumo.
import { MEALS, DOCE } from './data.js';
import { state, save, getDay, peekDay, proto, dayTotals, mealMacros, isTrainDay, isSaturday } from './store.js';
import { esc, num, fmtLong, today, minutesOfDay, now, hm, parseNum, diffDays } from './util.js';
import { ACT, INPUT, CHANGE, rerender, bar, check, ICON } from './ui.js';
import { macroLine, summaryBars } from './dieta.js';
import { workoutSummary } from './treino.js';

// Faixas de horário de cada refeição (em minutos do dia)
const SLOTS = [
  { id: 'cafe', until: hm('08:00') },
  { id: 'pos', until: hm('11:00') },
  { id: 'almoco', until: hm('14:30') },
  { id: 'lanche', until: hm('18:00') },
  { id: 'jantar', until: hm('21:30') },
  { id: 'doce', until: 24 * 60 },
];

function pickMeal(date) {
  const d = peekDay(date) || { meals: {}, extras: [] };
  const t = dayTotals(date);
  const pending = (id) => (id === 'doce' ? !d.meals.doce && !t.doceReplaced : !d.meals[id]);
  const mins = minutesOfDay(now());
  const slot = SLOTS.findIndex((s) => mins < s.until);
  for (let i = slot; i < SLOTS.length; i++) if (pending(SLOTS[i].id)) return { id: SLOTS[i].id, rel: i === slot ? 'now' : 'next' };
  for (let i = 0; i < slot; i++) if (pending(SLOTS[i].id)) return { id: SLOTS[i].id, rel: 'late' };
  return null;
}

ACT['water'] = (el) => {
  const d = getDay(el.dataset.date);
  d.water = Math.max(0, (d.water || 0) + +el.dataset.n);
  save(); rerender();
};
CHANGE['steps'] = (el) => { const d = getDay(el.dataset.date); d.steps = parseNum(el.value); save(); rerender(); };
ACT['go'] = (el) => { location.hash = el.dataset.to; };

function agoraCard(date) {
  const pick = pickMeal(date);
  if (!pick) return `<section class="card agora done"><div class="eyebrow">Refeições</div><h2>Tudo registrado hoje</h2>${macroLine(dayTotals(date).kcal, dayTotals(date).prot)}</section>`;
  const relLabel = { now: 'Agora', next: 'Próxima', late: 'Ficou sem registro' }[pick.rel];
  const d = peekDay(date) || { meals: {} };
  const late = SLOTS.filter((s, i) => s.id !== pick.id && s.id !== 'doce' && !d.meals[s.id] && i < SLOTS.findIndex((x) => x.id === pick.id)).length;
  const lateLink = late && pick.rel !== 'late' ? `<button class="link" data-act="go" data-to="#dieta">${late} ${late > 1 ? 'refeições' : 'refeição'} sem registro</button>` : '';

  if (pick.id === 'doce') {
    return `<section class="card agora"><div class="eyebrow">${relLabel}</div><h2>${DOCE.name}</h2>
      <p class="mut">Um OU outro. ~${DOCE.kcal} kcal.</p>
      <div class="stack">${DOCE.options.map((o, i) => `<button class="btn big" data-act="doce" data-date="${date}" data-opt="${i}">${esc(o)}</button>`).join('')}
      <button class="btn ghost" data-act="meal-skip" data-date="${date}" data-meal="doce">Pulei</button></div>${lateLink}</section>`;
  }
  const meal = MEALS.find((m) => m.id === pick.id);
  const a = `data-date="${date}" data-meal="${meal.id}"`;
  if (meal.id === 'jantar' && isSaturday(date)) {
    return `<section class="card agora free"><div class="eyebrow">${relLabel} · ${meal.time}</div><h2>Refeição livre</h2>
      <p>Aproveite. Uma bebida alcoólica se quiser.<br><b>Sem compensar depois.</b></p>
      <button class="btn big free" data-act="free-yes" data-date="${date}">Fiz a refeição livre</button>
      <button class="btn" data-act="meal-ok" ${a}>Comi o jantar do plano</button>${lateLink}</section>`;
  }
  const mm = mealMacros(meal, date);
  return `<section class="card agora">
    <div class="eyebrow">${relLabel} · ${meal.time}</div>
    <h2>${esc(meal.name)}</h2>
    <ul class="items">${meal.items(isTrainDay(date)).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    ${macroLine(mm.kcal, mm.prot)}
    <button class="btn big primary" data-act="meal-ok" ${a}>${ICON.check} Comi como está</button>
    <div class="grid2"><button class="btn" data-act="meal-swap" ${a}>Troquei</button><button class="btn" data-act="meal-skip" ${a}>Pulei</button></div>
    ${lateLink}
  </section>`;
}

function treinoCard(date) {
  const w = workoutSummary(date);
  return `<section class="card wk ${w.done ? 'is-done' : ''}">
    <div class="eyebrow">Treino de hoje</div>
    <div class="row-between"><h2>${esc(w.name)}</h2>${w.done ? `<span class="okmark">${ICON.check}</span>` : ''}</div>
    <p class="mut">${esc(w.sub)}</p>
    <button class="btn big ${w.done ? '' : 'primary'}" data-act="go" data-to="#treino">${w.done ? 'Ver treino' : w.started ? 'Continuar' : `${ICON.play} Começar`}</button>
  </section>`;
}

function resumoCard(date, p) {
  const d = peekDay(date) || {};
  const s = state.settings;
  const water = (d.water || 0) * s.cupMl;
  const stepGoal = s.weekSteps[p.week - 1];
  const steps = d.steps || 0;
  return `<section class="card">
    <h3>Resumo do dia</h3>
    ${summaryBars(date)}
    <div class="sumrow">
      <div class="sumhead"><span>Água</span><span><b>${num(water / 1000, 1)}</b> / ${num(s.waterGoalMl / 1000, 0)} L</span></div>
      ${bar(water, s.waterGoalMl, 'water')}
      <div class="water-btns">
        <button class="btn" data-act="water" data-n="-1" data-date="${date}" aria-label="Tirar um copo" ${water ? '' : 'disabled'}>−</button>
        <button class="btn water" data-act="water" data-n="1" data-date="${date}">${ICON.drop} + copo ${s.cupMl} ml</button>
      </div>
      <div class="sumfoot">${water >= s.waterGoalMl ? 'Meta batida' : `Faltam ${num((s.waterGoalMl - water) / 1000, 1)} L · ${Math.ceil((s.waterGoalMl - water) / s.cupMl)} copos`}</div>
    </div>
    <div class="sumrow">
      <div class="sumhead"><span>Passos</span><span>meta ${num(stepGoal)}</span></div>
      <label class="inp wide"><input data-change="steps" data-date="${date}" inputmode="numeric" value="${d.steps ?? ''}" placeholder="0" enterkeyhint="done"><span>passos</span></label>
      ${bar(steps, stepGoal, 'steps')}
      <div class="sumfoot">${steps >= stepGoal ? 'Meta batida' : `Faltam ${num(stepGoal - steps)}`}</div>
    </div>
    <button class="checkrow" data-act="creatina" data-date="${date}">${check(d.creatina)}<span>Creatina 3–5 g</span></button>
  </section>`;
}

export function renderHoje() {
  const date = today(); const p = proto(date);
  let status = `<b>Dia ${p.dayN}</b> de 28 · Semana ${p.week}`;
  if (p.before) status = `Começa em ${diffDays(date, state.settings.startDate)} dia(s)`;
  if (p.after) status = '<b>Protocolo concluído</b>';
  return `
    <header class="top">
      <div class="date">${fmtLong(date)}</div>
      <div class="dayline">${status}</div>
      ${bar(p.before ? 0 : p.dayN, 28, 'proto')}
    </header>
    ${agoraCard(date)}
    ${treinoCard(date)}
    ${resumoCard(date, p)}
  `;
}
