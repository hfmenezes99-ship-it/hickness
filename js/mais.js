// Aba Mais: diário, anotações, backup, lembretes e configurações.
import { DEFAULT_SETTINGS } from './data.js';
import { state, save, getDay, peekDay, replaceState, SCHEMA } from './store.js';
import { esc, num, today, parseNum } from './util.js';
import { ACT, INPUT, CHANGE, rerender, toast, confirmSheet } from './ui.js';
import { notifSupport, askPermission, testNotification, NOTIF_DEFAULT } from './notify.js';

// ---------- Diário ----------
const diary = (date) => { const d = getDay(date); d.diary ||= {}; return d.diary; };
ACT['diary'] = (el) => { const dy = diary(el.dataset.date); const v = +el.dataset.v; dy[el.dataset.f] = dy[el.dataset.f] === v ? null : v; save(); rerender(); };
CHANGE['sono'] = (el) => { diary(el.dataset.date).sono = parseNum(el.value); save(); toast('Sono registrado'); };
INPUT['notes'] = (el) => { state.notes = el.value; save(); };

// ---------- Backup ----------
ACT['export'] = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `protocolo28-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  state.lastExport = today(); save(); rerender();
};
CHANGE['import'] = (el) => {
  const f = el.files?.[0]; if (!f) return;
  f.text().then((txt) => {
    let data; try { data = JSON.parse(txt); } catch { toast('Arquivo inválido'); return; }
    if (!data || typeof data !== 'object' || !data.settings || !data.days) { toast('Não é um backup do Protocolo 28'); return; }
    if ((data.version || 0) > SCHEMA) { toast('Backup de versão mais nova do app'); return; }
    confirmSheet('Importar backup?', `Substitui todos os dados deste aparelho (${Object.keys(data.days).length} dias no arquivo).`, 'Importar', () => { replaceState(data); rerender(); toast('Backup importado'); });
  });
  el.value = '';
};
ACT['reset'] = () => confirmSheet('Apagar tudo?', 'Todos os registros deste aparelho somem. Exporte um backup antes.', 'Apagar tudo', () => {
  localStorage.removeItem('protocolo28'); location.reload();
});

// ---------- Lembretes ----------
ACT['notif-on'] = async () => {
  const n = (state.settings.notif ||= { ...NOTIF_DEFAULT });
  if (n.on) { n.on = false; save(); rerender(); return; }
  const ok = await askPermission();
  if (!ok) { toast('Permissão negada'); rerender(); return; }
  n.on = true; save(); rerender(); testNotification();
};
ACT['notif-type'] = (el) => { const n = state.settings.notif; n[el.dataset.k] = !n[el.dataset.k]; save(); rerender(); };

// ---------- Configurações ----------
CHANGE['set'] = (el) => {
  const k = el.dataset.k; const idx = el.dataset.i;
  let v = el.type === 'date' ? el.value : parseNum(el.value);
  if (v == null || v === '') { toast('Valor inválido'); rerender(); return; }
  if (el.dataset.mult) v = v * +el.dataset.mult;
  if (idx != null) state.settings[k][+idx] = v; else state.settings[k] = v;
  if (k === 'startWeight' && !state.weights[state.settings.startDate]) state.weights[state.settings.startDate] = v;
  save(); toast('Salvo'); rerender();
};
ACT['defaults'] = () => confirmSheet('Restaurar metas padrão?', 'Só as configurações. Os registros ficam.', 'Restaurar', () => {
  state.settings = { ...DEFAULT_SETTINGS, notif: state.settings.notif, shoulderSwap: state.settings.shoulderSwap }; save(); rerender();
});

// ---------- Render ----------
function scale(label, f, date, val) {
  return `<div class="field"><label>${label}</label><div class="scale">${[1, 2, 3, 4, 5].map((v) => `<button class="${val === v ? 'on' : ''}" data-act="diary" data-f="${f}" data-v="${v}" data-date="${date}">${v}</button>`).join('')}</div></div>`;
}
const numField = (label, k, unit, opts = {}) => {
  const raw = opts.i != null ? state.settings[k][opts.i] : state.settings[k];
  const shown = String(opts.mult ? raw / opts.mult : raw).replace('.', ',');
  return `<div class="field"><label>${label}</label><label class="inp"><input data-change="set" data-k="${k}" ${opts.i != null ? `data-i="${opts.i}"` : ''} ${opts.mult ? `data-mult="${opts.mult}"` : ''} inputmode="decimal" value="${shown}"><span>${unit}</span></label></div>`;
};

function notifSection() {
  const sup = notifSupport(); const n = state.settings.notif || NOTIF_DEFAULT;
  const on = n.on && sup.granted;
  const types = [['peso', 'Pesagem 06:00'], ['treino', 'Treino 07:00'], ['refeicoes', 'Refeições'], ['agua', 'Água a cada 2 h']];
  return `<section class="card"><h3>Lembretes</h3>
    ${sup.ok ? `<button class="btn ${on ? '' : 'primary'}" data-act="notif-on">${on ? 'Desativar lembretes' : 'Ativar lembretes'}</button>` : ''}
    ${on ? types.map(([k, l]) => `<button class="checkrow" data-act="notif-type" data-k="${k}"><span class="ck ${n[k] ? 'on' : ''}">${n[k] ? '✓' : ''}</span><span>${l}</span></button>`).join('') : ''}
    <div class="notice warn small-notice">${sup.ok
      ? 'Aviso: o navegador só dispara lembretes com o app aberto ou usado há pouco. Com o app fechado por muito tempo, eles podem não chegar.'
      : esc(sup.msg)}</div>
  </section>`;
}

export function renderMais() {
  const date = today(); const dy = peekDay(date)?.diary || {};
  const s = state.settings;
  return `
    <header class="top"><h1>Mais</h1></header>
    <section class="card"><h3>Diário de hoje</h3>
      <div class="field"><label>Sono</label><label class="inp"><input data-change="sono" data-date="${date}" inputmode="decimal" enterkeyhint="done" value="${dy.sono ?? ''}" placeholder="7,5"><span>horas</span></label></div>
      ${scale('Fome (1 pouca · 5 muita)', 'fome', date, dy.fome)}
      ${scale('Energia (1 baixa · 5 alta)', 'energia', date, dy.energia)}
    </section>
    <section class="card"><h3>Anotações</h3>
      <textarea data-input="notes" rows="5" placeholder="Escreva o que quiser…">${esc(state.notes)}</textarea>
    </section>
    ${notifSection()}
    <section class="card"><h3>Backup</h3>
      <p class="mut small">${state.lastExport ? `Último backup: ${state.lastExport.split('-').reverse().join('/')}` : 'Nenhum backup ainda.'}</p>
      <button class="btn primary" data-act="export">Exportar dados (JSON)</button>
      <label class="btn"><input type="file" accept="application/json,.json" data-change="import" hidden>Importar backup</label>
    </section>
    <details class="card settings"><summary>Configurações</summary>
      <div class="field"><label>Data de início (dia 1)</label><input type="date" data-change="set" data-k="startDate" value="${s.startDate}"></div>
      <div class="grid2">${numField('Peso inicial', 'startWeight', 'kg')}${numField('Meta final', 'goalWeight', 'kg')}</div>
      <p class="mut small sec">Meta de peso médio por semana</p>
      <div class="grid2">${[0, 1, 2, 3].map((i) => numField(`Semana ${i + 1}`, 'weekWeights', 'kg', { i })).join('')}</div>
      <p class="mut small sec">Meta de passos por semana</p>
      <div class="grid2">${[0, 1, 2, 3].map((i) => numField(`Semana ${i + 1}`, 'weekSteps', 'passos', { i })).join('')}</div>
      <div class="grid2">${numField('Meta de água', 'waterGoalMl', 'L', { mult: 1000 })}${numField('Copo', 'cupMl', 'ml')}</div>
      <div class="grid2">${numField('Descanso compostos', 'restCompound', 's')}${numField('Descanso demais', 'restOther', 's')}</div>
      <button class="btn ghost" data-act="defaults">Restaurar metas padrão</button>
      <button class="btn warn" data-act="reset">Apagar todos os dados</button>
    </details>
    <p class="mut small center">Protocolo 28 · dados só neste aparelho · esquema v${SCHEMA}</p>
  `;
}
