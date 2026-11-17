// Cálculos de progresso: peso, cintura, cumprimento e regras de ajuste.
import { PROTOCOL_DAYS, WORKOUTS } from './data.js';
import { state, peekDay, dayTotals, targets, protoEnd } from './store.js';
import { addDays, today } from './util.js';

export const dayDate = (n) => addDays(state.settings.startDate, n - 1);
export const lastDate = () => { const e = protoEnd(); const t = today(); return t < e ? t : e; };

// Dias do protocolo até hoje (inclusive)
export function daysSoFar() {
  const out = []; const last = lastDate();
  for (let n = 1; n <= PROTOCOL_DAYS; n++) { const d = dayDate(n); if (d > last) break; out.push(d); }
  return out;
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

// ---------- Peso ----------
export function ma7(date) {
  const vals = [];
  for (let i = 0; i < 7; i++) { const v = state.weights[addDays(date, -i)]; if (v != null) vals.push(v); }
  return avg(vals);
}
// Média de 7 dias na pesagem mais recente até a data
export function latestMa(upTo = lastDate()) {
  const d = Object.keys(state.weights).filter((x) => x <= upTo).sort().pop();
  return d ? { v: ma7(d), date: d } : null;
}
export function weekAvg(k) {
  const vals = [];
  for (let n = (k - 1) * 7 + 1; n <= k * 7; n++) { const v = state.weights[dayDate(n)]; if (v != null) vals.push(v); }
  return { avg: avg(vals), count: vals.length, complete: dayDate(k * 7) < today() };
}

// Regras de ajuste com base nas semanas já fechadas
export function adjustNotice() {
  const s = state.settings;
  const drops = [];
  let prev = s.startWeight;
  for (let k = 1; k <= 4; k++) {
    const w = weekAvg(k);
    if (!w.complete || w.count < 2) break;
    drops.push({ k, drop: prev - w.avg });
    prev = w.avg;
  }
  const last = drops[drops.length - 1];
  if (last && last.drop > 1.2) return { kind: 'add', text: `A média caiu ${fmt(last.drop)} kg na semana ${last.k}. Some 150 kcal por dia.`, k: last.k };
  if (drops.length >= 2) {
    const [a, b] = drops.slice(-2);
    if (a.drop < 0.4 && b.drop < 0.4) return { kind: 'cut', text: `A média caiu menos de 0,4 kg por duas semanas (${fmt(a.drop)} e ${fmt(b.drop)} kg). Corte 150 kcal: 40 g de carboidrato do almoço e do café.`, k: b.k };
  }
  return null;
}
const fmt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ---------- Cintura ----------
export const WAIST_GOAL = [null, -1.5, -3, -4];
export const WAIST_GOAL_TXT = ['medida inicial', '−1,5 cm', '−3 cm', '−4 a −5 cm'];
export function waistEntries() { return Object.entries(state.waist).sort(([a], [b]) => (a < b ? -1 : 1)); }

// ---------- Cumprimento ----------
export function dayInDiet(date) {
  const t = dayTotals(date);
  if (t.done < 4) return false;
  return t.free || t.kcal <= targets(date).kcal + 150;
}

export function compliance() {
  const days = daysSoFar();
  let treinos = 0, aerobicos = 0, dieta = 0;
  const steps = []; const water = [];
  for (const d of days) {
    const r = peekDay(d); if (!r) continue;
    if (r.workout?.done && WORKOUTS[r.workout.type]?.kind === 'forca') treinos++;
    if (r.cardio?.done && ['z2', 'run', 'brisk'].includes(r.cardio.type)) aerobicos++;
    if (dayInDiet(d)) dieta++;
    if (r.steps) steps.push(r.steps);
    if (r.water) water.push((r.water * state.settings.cupMl) / 1000);
  }
  return { treinos, aerobicos, dieta, passos: avg(steps), agua: avg(water), dias: days.length };
}
