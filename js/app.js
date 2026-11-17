// Entrada: roteamento por hash, barra inferior, service worker.
import { setRender, ICON } from './ui.js';
import { renderHoje } from './hoje.js';
import { renderDieta } from './dieta.js';
import { renderTreino } from './treino.js';
import { resumeTimers } from './timer.js';
import { renderMetas, mountMetas } from './metas.js';
import { renderMais } from './mais.js';
import { startReminders } from './notify.js';

const TABS = [
  { id: 'hoje', label: 'Hoje', render: renderHoje },
  { id: 'dieta', label: 'Dieta', render: renderDieta },
  { id: 'treino', label: 'Treino', render: renderTreino },
  { id: 'metas', label: 'Metas', render: renderMetas, mount: mountMetas },
  { id: 'mais', label: 'Mais', render: renderMais },
];

const main = document.getElementById('main');
const nav = document.getElementById('nav');

const current = () => TABS.find((t) => '#' + t.id === location.hash) || TABS[0];

function render() {
  const tab = current();
  main.innerHTML = tab.render();
  tab.mount && tab.mount();
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab.id));
}
setRender(render);

nav.innerHTML = TABS.map((t) => `<a href="#${t.id}" data-tab="${t.id}">${ICON[t.id]}<span>${t.label}</span></a>`).join('');

let lastTab = null;
window.addEventListener('hashchange', () => {
  render();
  if (lastTab !== current().id) window.scrollTo(0, 0);
  lastTab = current().id;
});

// Atualiza a tela Hoje a cada minuto (refeição da vez muda com a hora)
setInterval(() => {
  const a = document.activeElement;
  if (current().id === 'hoje' && !(a && a.matches('input,textarea,select')) && !document.querySelector('.sheet-wrap')) render();
}, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !document.querySelector('.sheet-wrap')) render(); });

render();
lastTab = current().id;
resumeTimers();
startReminders();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW', e));
}
