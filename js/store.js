// Estado único no localStorage, com versão de esquema.
import { DEFAULT_SETTINGS, PROTOCOL_DAYS, TRAIN_DOW, TARGETS, MEALS, DOCE, WEEK_PLAN } from './data.js';
import { diffDays, dow, today, addDays } from './util.js';

const KEY = 'protocolo28';
export const SCHEMA = 1;

function fresh() {
  return {
    version: SCHEMA,
    settings: { ...DEFAULT_SETTINGS },
    days: {},
    weights: { [DEFAULT_SETTINGS.startDate]: DEFAULT_SETTINGS.startWeight },
    waist: {},
    photos: {},
    shoulderLog: [],
    notes: '',
    timer: null,
  };
}

function migrate(s) {
  if (!s || typeof s !== 'object') return fresh();
  const base = fresh();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  // futuras migrações: if (out.version < 2) { ... }
  out.version = SCHEMA;
  return out;
}

export let state = load();

function load() {
  try { return migrate(JSON.parse(localStorage.getItem(KEY))); } catch { return fresh(); }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { console.error(e); return false; }
}

export function replaceState(s) { state = migrate(s); save(); }

export function getDay(date) {
  if (!state.days[date]) state.days[date] = { meals: {}, extras: [], water: 0, steps: null, creatina: false, workout: null, cardio: null };
  return state.days[date];
}
export const peekDay = (date) => state.days[date];

// ---------- Protocolo ----------
export function proto(date = today()) {
  const n = diffDays(state.settings.startDate, date) + 1;
  const dayN = Math.min(Math.max(n, 1), PROTOCOL_DAYS);
  const week = Math.min(Math.max(Math.ceil(dayN / 7), 1), 4);
  return { n, dayN, week, before: n < 1, after: n > PROTOCOL_DAYS, pct: Math.min(Math.max(n / PROTOCOL_DAYS, 0), 1) };
}
export const protoEnd = () => addDays(state.settings.startDate, PROTOCOL_DAYS - 1);

export const isTrainDay = (date) => TRAIN_DOW.includes(dow(date));
export const dayKind = (date) => (isTrainDay(date) ? 'treino' : 'descanso');
export const targets = (date) => TARGETS[dayKind(date)];
export const isSaturday = (date) => dow(date) === 6;

export function plannedWorkout(date) { return WEEK_PLAN[dow(date)]; }
export function workoutId(date) {
  return peekDay(date)?.override || plannedWorkout(date);
}

// ---------- Totais da dieta ----------
export function mealMacros(meal, date) {
  const k = isTrainDay(date) ? 't' : 'r';
  return { kcal: meal.kcal[k], prot: meal.prot[k] };
}

export function dayTotals(date) {
  const d = peekDay(date) || { meals: {}, extras: [] };
  let kcal = 0, prot = 0, free = false, done = 0, pending = 0;
  for (const meal of MEALS) {
    const st = d.meals[meal.id];
    if (!st) { pending++; continue; }
    done++;
    if (st.s === 'ok' || st.s === 'troca') { const m = mealMacros(meal, date); kcal += m.kcal; prot += m.prot; }
    else if (st.s === 'outro') { kcal += st.kcal || 0; prot += st.prot || 0; }
    else if (st.s === 'livre') free = true;
  }
  const doceReplaced = d.extras.some((e) => e.replacesDoce);
  if (!doceReplaced && d.meals.doce?.s === 'ok') { kcal += DOCE.kcal; prot += DOCE.prot; }
  for (const e of d.extras) { kcal += e.kcal || 0; prot += e.prot || 0; }
  return { kcal, prot, free, done, pending, doceReplaced };
}
