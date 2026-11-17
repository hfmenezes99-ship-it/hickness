// Aba Dieta + ações de refeição compartilhadas com a aba Hoje.
import { MEALS, DOCE, SWAP_RULES } from './data.js';
import { state, save, getDay, peekDay, dayTotals, targets, mealMacros, isTrainDay, isSaturday, proto, protoEnd } from './store.js';
import { esc, num, fmtLong, today, addDays, parseNum } from './util.js';
import { ACT, INPUT, rerender, openSheet, closeSheet, toast, bar, check, ICON } from './ui.js';

let viewDate = null; // data em visualização na aba Dieta
export const dietDate = () => viewDate || today();

const STATUS_LABEL = { ok: 'Feito', troca: 'Trocado', pulei: 'Pulei', outro: 'Outra coisa', livre: 'Refeição livre' };

export function setMeal(date, mealId, value, label) {
  const d = getDay(date);
  const prev = d.meals[mealId];
  if (value) d.meals[mealId] = value; else delete d.meals[mealId];
  save(); rerender();
  if (label) toast(label, { label: 'Desfazer', fn: () => { if (prev) d.meals[mealId] = prev; else delete d.meals[mealId]; save(); rerender(); } });
}

const mealName = (id) => (id === 'doce' ? DOCE.name : MEALS.find((m) => m.id === id)?.name);

ACT['meal-ok'] = (el) => setMeal(el.dataset.date, el.dataset.meal, { s: 'ok' }, `${mealName(el.dataset.meal)} registrado`);
ACT['meal-skip'] = (el) => setMeal(el.dataset.date, el.dataset.meal, { s: 'pulei' }, `${mealName(el.dataset.meal)}: pulei`);
ACT['meal-clear'] = (el) => setMeal(el.dataset.date, el.dataset.meal, null);
ACT['meal-swap'] = (el) => openSwap(el.dataset.date, el.dataset.meal);
ACT['free-yes'] = (el) => setMeal(el.dataset.date, 'jantar', { s: 'livre' }, 'Refeição livre registrada');
ACT['doce'] = (el) => setMeal(el.dataset.date, 'doce', { s: 'ok', note: DOCE.options[+el.dataset.opt] }, 'Docinho registrado');
ACT['extra-add'] = (el) => openExtra(el.dataset.date);
ACT['extra-del'] = (el) => {
  const d = getDay(el.dataset.date); const [rm] = d.extras.splice(+el.dataset.i, 1); save(); rerender();
  toast('Extra removido', { label: 'Desfazer', fn: () => { d.extras.splice(+el.dataset.i, 0, rm); save(); rerender(); } });
};
ACT['creatina'] = (el) => { const d = getDay(el.dataset.date); d.creatina = !d.creatina; save(); rerender(); };
ACT['diet-prev'] = () => { viewDate = addDays(dietDate(), -1); rerender(); };
ACT['diet-next'] = () => { const n = addDays(dietDate(), 1); viewDate = n >= today() ? null : n; rerender(); };
ACT['diet-today'] = () => { viewDate = null; rerender(); };

// ---------- Folha de troca ----------
function openSwap(date, mealId) {
  const meal = MEALS.find((m) => m.id === mealId);
  const groups = meal.swaps.map((g, gi) => `
    <div class="field"><label>${esc(g.label)} <span class="mut">(era ${esc(g.from)})</span></label>
      <div class="chips" data-group="${gi}">${g.options.map((o) => `<button type="button" class="chip" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
    </div>`).join('');
  openSheet(`
    <h2>Troquei · ${esc(meal.name)}</h2>
    ${groups || '<p class="mut">Sem trocas previstas para esta refeição.</p>'}
    ${groups ? `<button class="btn primary" data-save>Salvar troca</button>` : ''}
    <details class="other" ${groups ? '' : 'open'}><summary>Comi outra coisa</summary>
      <div class="field"><label>O que foi</label><input data-f="name" placeholder="Ex.: marmita do trabalho" autocomplete="off"></div>
      <div class="grid2">
        <div class="field"><label>kcal (estimada)</label><input data-f="kcal" inputmode="numeric" placeholder="500"></div>
        <div class="field"><label>Proteína (g)</label><input data-f="prot" inputmode="numeric" placeholder="30"></div>
      </div>
      <button class="btn" data-other>Salvar</button>
    </details>
    <div class="rules">${SWAP_RULES.map((r) => `<p>${esc(r)}</p>`).join('')}</div>
  `, (s) => {
    s.querySelectorAll('.chips').forEach((c) => c.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      const was = b.classList.contains('on');
      c.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
      if (!was) b.classList.add('on');
    }));
    const saveBtn = s.querySelector('[data-save]');
    if (saveBtn) saveBtn.onclick = () => {
      const parts = [];
      s.querySelectorAll('.chips').forEach((c) => {
        const on = c.querySelector('.chip.on'); if (on) parts.push(`${meal.swaps[+c.dataset.group].from} → ${on.dataset.v}`);
      });
      closeSheet();
      setMeal(date, mealId, { s: 'troca', note: parts.join(' · ') || 'Troca' }, `${meal.name}: troca registrada`);
    };
    s.querySelector('[data-other]').onclick = () => {
      const f = (k) => s.querySelector(`[data-f="${k}"]`).value;
      const kcal = parseNum(f('kcal'));
      if (kcal == null) { s.querySelector('[data-f="kcal"]').focus(); return; }
      closeSheet();
      setMeal(date, mealId, { s: 'outro', note: f('name').trim() || 'Outra coisa', kcal, prot: parseNum(f('prot')) || 0 }, `${meal.name}: registrado`);
    };
  });
}

// ---------- Folha de extra ----------
function openExtra(date) {
  openSheet(`
    <h2>Extra fora do plano</h2>
    <div class="field"><label>O que foi</label><input data-f="name" placeholder="Ex.: cookie da loja" autocomplete="off"></div>
    <div class="grid2">
      <div class="field"><label>kcal (estimada)</label><input data-f="kcal" inputmode="numeric" placeholder="200"></div>
      <div class="field"><label>Proteína (g)</label><input data-f="prot" inputmode="numeric" placeholder="3"></div>
    </div>
    <label class="toggle"><input type="checkbox" data-f="doce" checked> <span>Entra no lugar do docinho</span></label>
    <button class="btn primary" data-ok>Registrar</button>
  `, (s) => {
    s.querySelector('[data-f="name"]').focus();
    s.querySelector('[data-ok]').onclick = () => {
      const f = (k) => s.querySelector(`[data-f="${k}"]`);
      const kcal = parseNum(f('kcal').value);
      if (kcal == null) { f('kcal').focus(); return; }
      const d = getDay(date);
      d.extras.push({ name: f('name').value.trim() || 'Extra', kcal, prot: parseNum(f('prot').value) || 0, replacesDoce: f('doce').checked });
      save(); closeSheet(); rerender(); toast('Extra registrado');
    };
  });
}

// ---------- Componentes reutilizados ----------
export function mealStatusChip(st) {
  if (!st) return '';
  const cls = st.s === 'pulei' ? 'skip' : st.s === 'livre' ? 'free' : 'done';
  return `<span class="status ${cls}">${STATUS_LABEL[st.s]}${st.note ? ` · ${esc(st.note)}` : ''}</span>`;
}

export function macroLine(kcal, prot) {
  return `<div class="macros"><span><b>${num(kcal)}</b> kcal</span><span><b>${num(prot)}</b> g prot</span></div>`;
}

export function summaryBars(date) {
  const t = dayTotals(date); const tg = targets(date);
  const restK = tg.kcal - t.kcal; const restP = tg.prot - t.prot;
  return `
    <div class="sumrow">
      <div class="sumhead"><span>Calorias</span><span><b>${num(t.kcal)}</b> / ${num(tg.kcal)}</span></div>
      ${bar(t.kcal, tg.kcal, t.kcal > tg.kcal + 100 ? 'over' : '')}
      <div class="sumfoot">${t.free ? 'Refeição livre hoje · ' : ''}${restK >= 0 ? `Faltam ${num(restK)} kcal` : `${num(-restK)} kcal acima`}</div>
    </div>
    <div class="sumrow">
      <div class="sumhead"><span>Proteína</span><span><b>${num(t.prot)}</b> / ${num(tg.prot)} g</span></div>
      ${bar(t.prot, tg.prot, 'prot')}
      <div class="sumfoot">${restP > 0 ? `Faltam ${num(restP)} g` : 'Meta batida'}</div>
    </div>`;
}

function mealCard(meal, date) {
  const d = peekDay(date) || { meals: {} };
  const st = d.meals[meal.id];
  const train = isTrainDay(date);
  const freeNight = meal.id === 'jantar' && isSaturday(date);
  const mm = mealMacros(meal, date);
  const a = `data-date="${date}" data-meal="${meal.id}"`;
  const actions = st
    ? `<div class="row-end">${mealStatusChip(st)}<button class="btn small ghost" data-act="meal-clear" ${a}>Mudar</button></div>`
    : `<div class="seg3">
        <button class="btn ok" data-act="meal-ok" ${a}>${ICON.check} Feito</button>
        <button class="btn" data-act="meal-swap" ${a}>Troquei</button>
        <button class="btn" data-act="meal-skip" ${a}>Pulei</button>
      </div>`;
  return `
    <section class="card meal ${st ? 'is-done' : ''}">
      <div class="meal-h"><span class="time">${meal.time}</span><h3>${esc(meal.name)}</h3></div>
      ${meal.note ? `<p class="mut small">${esc(meal.note)}</p>` : ''}
      ${freeNight ? `<div class="free-box"><b>Sábado à noite: refeição livre.</b><br>Uma bebida alcoólica se quiser. Sem compensar depois.
        ${st ? '' : `<button class="btn free" data-act="free-yes" data-date="${date}">Fiz a refeição livre</button>`}</div>` : ''}
      <ul class="items">${meal.items(train).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      ${macroLine(mm.kcal, mm.prot)}
      ${meal.id === 'pos' ? `<button class="checkrow" data-act="creatina" data-date="${date}">${check(d.creatina)}<span>Creatina 3–5 g</span></button>` : ''}
      ${actions}
    </section>`;
}

function doceCard(date) {
  const d = peekDay(date) || { meals: {}, extras: [] };
  const t = dayTotals(date);
  const st = d.meals.doce;
  let body;
  if (t.doceReplaced) {
    const ex = d.extras.find((e) => e.replacesDoce);
    body = `<span class="status done">Trocado por ${esc(ex.name)}</span>`;
  } else if (st) {
    body = `<div class="row-end">${mealStatusChip(st)}<button class="btn small ghost" data-act="meal-clear" data-date="${date}" data-meal="doce">Mudar</button></div>`;
  } else {
    body = `<div class="stack">
      ${DOCE.options.map((o, i) => `<button class="btn" data-act="doce" data-date="${date}" data-opt="${i}">${esc(o)}</button>`).join('')}
      <button class="btn ghost" data-act="meal-skip" data-date="${date}" data-meal="doce">Pulei</button>
    </div>`;
  }
  return `<section class="card meal ${st || t.doceReplaced ? 'is-done' : ''}">
    <div class="meal-h"><span class="time">extra</span><h3>${DOCE.name}</h3></div>
    <p class="mut small">Um OU outro. Nunca os dois. ~${DOCE.kcal} kcal.</p>
    ${body}
  </section>`;
}

function extrasCard(date) {
  const d = peekDay(date) || { extras: [] };
  return `<section class="card">
    <h3>Fora do plano</h3>
    ${d.extras.length ? `<ul class="extras">${d.extras.map((e, i) => `
      <li><div><b>${esc(e.name)}</b><div class="mut small">${num(e.kcal)} kcal · ${num(e.prot)} g${e.replacesDoce ? ' · no lugar do docinho' : ''}</div></div>
      <button class="iconbtn" data-act="extra-del" data-date="${date}" data-i="${i}" aria-label="Remover">${ICON.x}</button></li>`).join('')}</ul>` : ''}
    <button class="btn" data-act="extra-add" data-date="${date}">+ Registrar extra</button>
  </section>`;
}

export function renderDieta() {
  const date = dietDate();
  const p = proto(date);
  const tg = targets(date);
  const canPrev = date > state.settings.startDate;
  const canNext = date < today() && date < protoEnd();
  return `
    <header class="top">
      <div class="datenav">
        <button class="iconbtn" data-act="diet-prev" ${canPrev ? '' : 'disabled'} aria-label="Dia anterior">${ICON.left}</button>
        <div class="dn-mid">${date === today() ? '' : '<button class="link" data-act="diet-today">voltar para hoje</button>'}<div class="date">${fmtLong(date)}</div><div class="mut small">Dia ${p.dayN} de 28</div></div>
        <button class="iconbtn" data-act="diet-next" ${canNext ? '' : 'disabled'} aria-label="Próximo dia">${ICON.right}</button>
      </div>
    </header>
    <section class="card">
      <div class="pill ${isTrainDay(date) ? 'train' : 'rest'}">${tg.label} · ${num(tg.kcal)} kcal · ${tg.prot} g</div>
      ${summaryBars(date)}
    </section>
    ${MEALS.map((m) => mealCard(m, date)).join('')}
    ${doceCard(date)}
    ${extrasCard(date)}
    <details class="card info"><summary>Trocas permitidas</summary>${SWAP_RULES.map((r) => `<p>${esc(r)}</p>`).join('')}
      <p><b>Refeição livre:</b> 1 por semana, sábado à noite, com uma bebida alcoólica se quiser. Sem compensar depois.</p></details>
  `;
}
