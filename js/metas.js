// Aba Metas: peso + gráfico, cintura, fotos, painel, avisos de ajuste e fechamento.
import { PROTOCOL_DAYS } from './data.js';
import { state, save, proto } from './store.js';
import { esc, num, today, fmtShort, parseNum, dow, diffDays } from './util.js';
import { ACT, INPUT, CHANGE, rerender, openSheet, closeSheet, toast, bar, ICON, confirmSheet } from './ui.js';
import { ma7, latestMa, weekAvg, adjustNotice, WAIST_GOAL, WAIST_GOAL_TXT, waistEntries, compliance, dayDate, lastDate } from './stats.js';

const kg = (v) => num(v, 1);

// ---------- Ações ----------
CHANGE['w-today'] = (el) => {
  const v = parseNum(el.value);
  if (v == null) delete state.weights[el.dataset.date];
  else if (v > 30 && v < 250) state.weights[el.dataset.date] = v;
  else { toast('Peso fora do normal'); return; }
  save(); rerender(); toast('Peso registrado');
};
ACT['w-del'] = (el) => {
  const d = el.dataset.date; const prev = state.weights[d]; delete state.weights[d]; save(); rerender();
  toast('Peso apagado', { label: 'Desfazer', fn: () => { state.weights[d] = prev; save(); rerender(); } });
};
CHANGE['waist'] = (el) => {
  const v = parseNum(el.value);
  if (v == null) delete state.waist[el.dataset.date];
  else if (v > 40 && v < 200) state.waist[el.dataset.date] = v;
  else { toast('Medida fora do normal'); return; }
  save(); rerender(); toast('Cintura registrada');
};
ACT['waist-del'] = (el) => { delete state.waist[el.dataset.date]; save(); rerender(); };
ACT['adj-ok'] = (el) => { state.adjustSeen = el.dataset.key; save(); rerender(); };

// ---------- Fotos ----------
const POSES = [['frente', 'Frente'], ['lado', 'Lado'], ['costas', 'Costas']];

function compress(file, max = 720, q = 0.72) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = rej; img.src = url;
  });
}
CHANGE['photo'] = async (el) => {
  const f = el.files?.[0]; if (!f) return;
  try {
    const prev = state.photos[el.dataset.key];
    state.photos[el.dataset.key] = await compress(f);
    if (!save()) { if (prev) state.photos[el.dataset.key] = prev; else delete state.photos[el.dataset.key]; save(); toast('Sem espaço para a foto'); return; }
    rerender(); toast('Foto salva no aparelho');
  } catch { toast('Não consegui abrir a foto'); }
};
ACT['photo-view'] = (el) => {
  const key = el.dataset.key;
  openSheet(`<img class="photo-big" src="${state.photos[key]}" alt="">
    <button class="btn warn" data-del>Apagar foto</button><button class="btn ghost" data-close>Fechar</button>`, (s) => {
    s.querySelector('[data-del]').onclick = () => { delete state.photos[key]; save(); closeSheet(); rerender(); };
  });
};

function photoCell(key, label) {
  const src = state.photos[key];
  if (src) return `<button class="photo" data-act="photo-view" data-key="${key}"><img src="${src}" alt="${label}"><span>${label}</span></button>`;
  return `<label class="photo empty"><input type="file" accept="image/*" capture="environment" data-change="photo" data-key="${key}" hidden><b>+</b><span>${label}</span></label>`;
}
function photosGrid(only) {
  const rows = [['d1', 'Dia 1'], ['d28', 'Dia 28']].filter(([k]) => !only || only.includes(k));
  return rows.map(([k, t]) => `<div class="mut small ph-row">${t}</div><div class="photos">${POSES.map(([p, l]) => photoCell(`${k}_${p}`, l)).join('')}</div>`).join('');
}

// ---------- Gráfico de peso ----------
function chartData() {
  const last = lastDate();
  const pts = [];
  for (let n = 1; n <= PROTOCOL_DAYS; n++) {
    const d = dayDate(n);
    pts.push({ n, d, w: state.weights[d] ?? null, ma: d <= last && state.weights[d] != null ? ma7(d) : null, meta: state.settings.weekWeights[Math.ceil(n / 7) - 1] });
  }
  return pts;
}

function weightChart() {
  const s = state.settings; const pts = chartData();
  const vals = pts.flatMap((p) => [p.w, p.ma]).filter((v) => v != null);
  const lo = Math.floor(Math.min(s.goalWeight, ...s.weekWeights, ...vals) - 0.5);
  const hi = Math.ceil(Math.max(s.startWeight, ...vals) + 0.3);
  const W = 340, H = 210, L = 34, R = 10, T = 10, B = 26;
  const x = (n) => L + ((n - 1) / (PROTOCOL_DAYS - 1)) * (W - L - R);
  const y = (v) => T + ((hi - v) / (hi - lo || 1)) * (H - T - B);
  const step = hi - lo > 8 ? 2 : 1;
  let grid = '';
  for (let v = lo; v <= hi; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${L - 6}" y="${y(v) + 4}" class="yl">${v}</text>`;
  const xl = [1, 7, 14, 21, 28].map((n) => `<text x="${x(n)}" y="${H - 6}" class="xl">${n === 1 ? 'dia 1' : n}</text>`).join('');
  const meta = [1, 2, 3, 4].map((k) => `<line x1="${x((k - 1) * 7 + 1)}" x2="${x(k * 7)}" y1="${y(s.weekWeights[k - 1])}" y2="${y(s.weekWeights[k - 1])}" class="meta"/>`).join('');
  const maPts = pts.filter((p) => p.ma != null);
  const maPath = maPts.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.ma).toFixed(1)}`).join('');
  const dots = pts.filter((p) => p.w != null).map((p) => `<circle cx="${x(p.n)}" cy="${y(p.w)}" r="4" class="dot"/>`).join('');
  const todayN = proto().n;
  const tLine = todayN >= 1 && todayN <= PROTOCOL_DAYS ? `<line x1="${x(todayN)}" x2="${x(todayN)}" y1="${T}" y2="${H - B}" class="today"/>` : '';
  chartGeom = { x, y, L, R, W, pts };
  return `<div class="chart" id="wchart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Peso diário, média de 7 dias e meta semanal">
      ${grid}${xl}${tLine}${meta}
      ${maPath ? `<path d="${maPath}" class="ma"/>` : ''}
      ${dots}
      <line id="xh" class="xh" y1="${T}" y2="${H - B}" x1="-10" x2="-10"/>
      <rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" id="hit"/>
    </svg>
    <div class="tip" id="tip" hidden></div>
    <div class="legend"><span><i class="k ma"></i>Média 7 dias</span><span><i class="k meta"></i>Meta da semana</span><span><i class="k dot"></i>Peso do dia</span></div>
  </div>`;
}
let chartGeom = null;

export function mountMetas() {
  const box = document.getElementById('wchart'); if (!box || !chartGeom) return;
  const svg = box.querySelector('svg'); const tip = box.querySelector('#tip'); const xh = box.querySelector('#xh');
  const { x, L, R, W, pts } = chartGeom;
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const sx = ((ev.clientX - r.left) / r.width) * W;
    const n = Math.min(PROTOCOL_DAYS, Math.max(1, Math.round(((sx - L) / (W - L - R)) * (PROTOCOL_DAYS - 1)) + 1));
    const p = pts[n - 1];
    xh.setAttribute('x1', x(n)); xh.setAttribute('x2', x(n));
    tip.hidden = false; tip.textContent = '';
    const head = document.createElement('div'); head.className = 'mut small'; head.textContent = `Dia ${n} · ${fmtShort(p.d)}`; tip.appendChild(head);
    const row = (label, v, cls) => { const d = document.createElement('div'); d.innerHTML = `<i class="k ${cls}"></i><b></b> <span class="mut"></span>`; d.querySelector('b').textContent = v == null ? '—' : `${kg(v)} kg`; d.querySelector('span').textContent = label; tip.appendChild(d); };
    row('média', p.ma, 'ma'); row('meta', p.meta, 'meta'); row('dia', p.w, 'dot');
    const px = (x(n) / W) * r.width;
    tip.style.left = `${px > r.width / 2 ? Math.max(px - 160, 0) : Math.min(px + 10, r.width - 150)}px`;
  };
  const hit = svg.querySelector('#hit');
  hit.addEventListener('pointerdown', show); hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('x1', -10); xh.setAttribute('x2', -10); });
}

// ---------- Seções ----------
function weightSection() {
  const t = today(); const p = proto(); const s = state.settings;
  const curMa = latestMa()?.v ?? null;
  const metaW = s.weekWeights[p.week - 1];
  const entries = Object.entries(state.weights).sort(([a], [b]) => (a < b ? 1 : -1));
  const diff = curMa != null ? curMa - metaW : null;
  return `<section class="card">
    <h3>Peso em jejum</h3>
    <label class="inp wide"><input data-change="w-today" data-date="${t}" inputmode="decimal" enterkeyhint="done" value="${state.weights[t] ?? ''}" placeholder="Hoje"><span>kg</span></label>
    <div class="stats3">
      <div><span class="mut small">Média 7 dias</span><b>${curMa != null ? kg(curMa) : '—'}</b></div>
      <div><span class="mut small">Meta sem. ${p.week}</span><b>${kg(metaW)}</b></div>
      <div><span class="mut small">Diferença</span><b class="${diff == null ? '' : diff <= 0 ? 'good' : 'bad'}">${diff == null ? '—' : `${diff > 0 ? '+' : ''}${kg(diff)}`}</b></div>
    </div>
    ${weightChart()}
    <details class="list"><summary>Registros (${entries.length})</summary>
      ${entries.map(([d, v]) => `<div class="li"><span>${fmtShort(d)}</span><b>${kg(v)} kg</b><button class="iconbtn" data-act="w-del" data-date="${d}" aria-label="Apagar">${ICON.x}</button></div>`).join('')}
    </details>
  </section>`;
}

function waistSection() {
  const t = today(); const p = proto();
  const e = waistEntries();
  const base = e[0]?.[1]; const lastV = e[e.length - 1]?.[1];
  const delta = base != null && e.length > 1 ? lastV - base : null;
  const goal = WAIST_GOAL[p.week - 1];
  const isMonday = dow(t) === 1 || p.n === 1;
  return `<section class="card">
    <h3>Cintura</h3>
    <p class="mut small">${isMonday ? '<b class="good">Hoje é dia de medir.</b> ' : 'Medir toda segunda. '}Na altura do umbigo.</p>
    <label class="inp wide"><input data-change="waist" data-date="${t}" inputmode="decimal" enterkeyhint="done" value="${state.waist[t] ?? ''}" placeholder="Hoje"><span>cm</span></label>
    <div class="stats3">
      <div><span class="mut small">Início</span><b>${base != null ? num(base, 1) : '—'}</b></div>
      <div><span class="mut small">Variação</span><b class="${delta == null ? '' : goal != null && delta <= goal ? 'good' : ''}">${delta == null ? '—' : `${delta > 0 ? '+' : ''}${num(delta, 1)}`}</b></div>
      <div><span class="mut small">Meta sem. ${p.week}</span><b>${WAIST_GOAL_TXT[p.week - 1].replace('medida inicial', '—')}</b></div>
    </div>
    ${e.length ? `<details class="list"><summary>Registros (${e.length})</summary>${e.slice().reverse().map(([d, v]) => `<div class="li"><span>${fmtShort(d)}</span><b>${num(v, 1)} cm</b><button class="iconbtn" data-act="waist-del" data-date="${d}" aria-label="Apagar">${ICON.x}</button></div>`).join('')}</details>` : ''}
  </section>`;
}

function tile(label, val, max, sub) {
  return `<div class="tile"><span class="mut small">${label}</span><b>${val}${max != null ? `<small> / ${max}</small>` : ''}</b>${max != null ? bar(parseFloat(val) || 0, max) : ''}${sub ? `<span class="mut small">${sub}</span>` : ''}</div>`;
}
function panelSection() {
  const c = compliance(); const s = state.settings;
  return `<section class="card"><h3>Cumprimento</h3>
    <div class="tiles">
      ${tile('Treinos', c.treinos, 16)}
      ${tile('Aeróbicos', c.aerobicos, 8)}
      ${tile('Dias na dieta', c.dieta, 25, `de ${c.dias} dias até agora`)}
      ${tile('Passos/dia', c.passos != null ? num(Math.round(c.passos)) : '—', null, 'média')}
      ${tile('Água/dia', c.agua != null ? `${num(c.agua, 1)} L` : '—', null, `meta ${num(s.waterGoalMl / 1000, 0)} L`)}
    </div>
    <p class="mut small">Dia na dieta: 4+ refeições registradas e até 150 kcal acima da meta (refeição livre conta).</p>
  </section>`;
}

function adjustSection() {
  const a = adjustNotice(); if (!a) return '';
  const key = `${a.kind}-${a.k}`;
  if (state.adjustSeen === key) return '';
  return `<section class="card notice ${a.kind}"><b>${a.kind === 'cut' ? 'Ajuste: cortar 150 kcal' : 'Ajuste: somar 150 kcal'}</b><p>${esc(a.text)}</p>
    <button class="btn small ghost" data-act="adj-ok" data-key="${key}">Entendi</button></section>`;
}

function closingSection() {
  const p = proto(); if (p.n < PROTOCOL_DAYS) return '';
  const s = state.settings;
  const w1 = state.weights[s.startDate] ?? s.startWeight;
  const wEndM = latestMa(dayDate(PROTOCOL_DAYS)); const wEnd = wEndM?.v ?? null;
  const e = waistEntries(); const cIni = e[0]?.[1]; const cEnd = e.length > 1 ? e[e.length - 1][1] : null;
  const c = compliance();
  const hit = wEnd != null && wEnd <= s.goalWeight + 0.05;
  return `<section class="card closing" id="fechamento">
    <div class="eyebrow">Fechamento · 28 dias</div>
    <h2>${hit ? 'Meta batida' : 'Protocolo concluído'}</h2>
    <table class="cmp"><thead><tr><th></th><th>Dia 1</th><th>Dia 28</th><th>Δ</th></tr></thead><tbody>
      <tr><td>Peso</td><td>${kg(w1)}</td><td>${wEnd != null ? kg(wEnd) : '—'}<small>${wEndM && wEndM.date !== dayDate(PROTOCOL_DAYS) ? `média 7d · ${fmtShort(wEndM.date)}` : 'média 7d'}</small></td><td>${wEnd != null ? kg(wEnd - w1) : '—'}</td></tr>
      <tr><td>Cintura</td><td>${cIni != null ? num(cIni, 1) : '—'}</td><td>${cEnd != null ? num(cEnd, 1) : '—'}</td><td>${cEnd != null ? num(cEnd - cIni, 1) : '—'}</td></tr>
    </tbody></table>
    <p class="mut small">Meta: ${kg(s.goalWeight)} kg e cintura 4 a 5 cm menor.</p>
    <div class="tiles">${tile('Treinos', c.treinos, 16)}${tile('Aeróbicos', c.aerobicos, 8)}${tile('Dias na dieta', c.dieta, 25)}</div>
    ${photosGrid()}
  </section>`;
}

export function renderMetas() {
  const p = proto();
  const showD28 = p.n >= PROTOCOL_DAYS - 1;
  return `
    <header class="top"><h1>Metas</h1><div class="mut">Meta final ${kg(state.settings.goalWeight)} kg · cintura −4 a −5 cm</div></header>
    ${closingSection()}
    ${adjustSection()}
    ${weightSection()}
    ${waistSection()}
    ${panelSection()}
    ${p.n < PROTOCOL_DAYS ? `<section class="card"><h3>Fotos</h3><p class="mut small">Dia 1 e dia 28. Ficam só no aparelho.</p>${photosGrid(showD28 ? null : ['d1'])}${showD28 ? '' : `<p class="mut small">Fotos do dia 28 liberam em ${diffDays(today(), dayDate(PROTOCOL_DAYS - 1))} dia(s).</p>`}</section>` : ''}
  `;
}
