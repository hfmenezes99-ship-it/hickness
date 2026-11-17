// Lembretes locais. O navegador só dispara com o app aberto ou recém-usado:
// não existe agendamento confiável de notificação em segundo plano na web.
import { MEALS } from './data.js';
import { state, save, peekDay, proto, isSaturday, workoutId } from './store.js';
import { today, minutesOfDay, now, hm } from './util.js';
import { WORKOUTS } from './data.js';

export const NOTIF_DEFAULT = { on: false, refeicoes: true, agua: true, treino: true, peso: true };
const SENT_KEY = 'protocolo28_sent';
const WINDOW = 30; // minutos de tolerância após o horário

export function notifSupport() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!('Notification' in window)) return { ok: false, msg: ios && !standalone ? 'No iPhone, instale o app na tela inicial para poder ativar lembretes.' : 'Este navegador não mostra notificações. O resto do app funciona normalmente.' };
  if (Notification.permission === 'denied') return { ok: false, msg: 'Notificações bloqueadas nas configurações do navegador para este site.' };
  return { ok: true, granted: Notification.permission === 'granted' };
}

export async function askPermission() {
  if (!('Notification' in window)) return false;
  const r = await Notification.requestPermission();
  return r === 'granted';
}

export function remindersFor(date) {
  const n = state.settings.notif || NOTIF_DEFAULT; const out = [];
  const d = peekDay(date) || { meals: {} };
  const p = proto(date);
  if (p.before || p.after) return out;
  if (n.peso && !state.weights[date]) out.push({ id: 'peso', at: '06:00', title: 'Peso em jejum', body: 'Suba na balança antes de comer.' });
  if (n.treino) { const w = WORKOUTS[workoutId(date)]; out.push({ id: 'treino', at: '07:00', title: `Treino: ${w.name}`, body: 'Hora de começar.' }); }
  if (n.refeicoes) for (const m of MEALS) {
    if (d.meals[m.id]) continue;
    const free = m.id === 'jantar' && isSaturday(date);
    out.push({ id: m.id, at: m.time, title: free ? 'Refeição livre' : m.name, body: free ? 'Aproveite. Sem compensar depois.' : m.items(true).slice(0, 2).join(' · ') });
  }
  if (n.agua) {
    const goalCups = Math.ceil(state.settings.waterGoalMl / state.settings.cupMl);
    if ((d.water || 0) < goalCups) for (let h = 8; h <= 20; h += 2) out.push({ id: `agua${h}`, at: `${String(h).padStart(2, '0')}:00`, title: 'Água', body: `${(((d.water || 0) * state.settings.cupMl) / 1000).toLocaleString('pt-BR')} L até agora. Bebe um copo.` });
  }
  return out;
}

function sentLog() {
  try { const s = JSON.parse(localStorage.getItem(SENT_KEY)) || {}; return s.date === today() ? s : { date: today(), ids: [] }; } catch { return { date: today(), ids: [] }; }
}

async function show(r) {
  const opts = { body: r.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: `p28-${r.id}`, data: { url: './#hoje' } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(r.title, opts); return; }
  } catch { /* cai no fallback */ }
  try { new Notification(r.title, opts); } catch { /* ignore */ }
}

export function checkReminders() {
  const n = state.settings.notif;
  if (!n?.on || !('Notification' in window) || Notification.permission !== 'granted') return;
  const date = today(); const mins = minutesOfDay(now());
  const log = sentLog();
  for (const r of remindersFor(date)) {
    const t = hm(r.at);
    if (mins >= t && mins < t + WINDOW && !log.ids.includes(r.id)) { log.ids.push(r.id); show(r); }
  }
  localStorage.setItem(SENT_KEY, JSON.stringify(log));
}

export function startReminders() {
  if (!state.settings.notif) { state.settings.notif = { ...NOTIF_DEFAULT }; save(); }
  checkReminders();
  setInterval(checkReminders, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkReminders(); });
}

export function testNotification() { show({ id: 'teste', title: 'Protocolo 28', body: 'Lembretes ativos.' }); }
