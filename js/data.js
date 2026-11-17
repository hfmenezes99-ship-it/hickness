// Dados fixos do protocolo: refeições, treinos, aeróbicos.

export const PROTOCOL_DAYS = 28;

export const DEFAULT_SETTINGS = {
  startDate: '2026-11-17',
  startWeight: 79,
  goalWeight: 75.5,
  heightCm: 172,
  weekWeights: [78.2, 77.3, 76.4, 75.5],
  weekSteps: [8000, 9000, 10000, 10000],
  waterGoalMl: 3000,
  cupMl: 300,
  restCompound: 150,
  restOther: 75,
  shoulderSwap: false,
  notif: { on: false, refeicoes: true, agua: true, treino: true, peso: true },
};

// Dias de treino de musculação: seg(1), ter(2), qui(4), sex(5)
export const TRAIN_DOW = [1, 2, 4, 5];

export const TARGETS = {
  treino: { kcal: 1980, prot: 175, label: 'Dia de treino' },
  descanso: { kcal: 1850, prot: 170, label: 'Dia de descanso' },
};

// Cada refeição: itens e macros por tipo de dia (t = treino, r = descanso)
export const MEALS = [
  {
    id: 'cafe', name: 'Café da manhã', time: '06:30', note: '30 min antes do treino',
    items: () => ['3 ovos mexidos + 1 clara', '1 fatia de pão integral ou 80 g de cuscuz', 'Café sem açúcar'],
    kcal: { t: 380, r: 380 }, prot: { t: 26, r: 26 },
    swaps: [
      { label: 'Proteína', from: 'Ovos', options: ['Frango', 'Patinho', 'Peixe'] },
      { label: 'Carboidrato', from: 'Pão integral', options: ['Cuscuz 80 g', 'Batata-doce', 'Arroz', 'Macarrão'] },
    ],
  },
  {
    id: 'pos', name: 'Pós-treino', time: '09:30', note: 'Com a creatina',
    items: (t) => t
      ? ['1 scoop de whey com água', '1 banana', '20 g de aveia']
      : ['1 scoop de whey com água', '1 banana', 'Sem aveia (descanso)'],
    kcal: { t: 290, r: 215 }, prot: { t: 28, r: 25 },
    swaps: [{ label: 'Fruta', from: 'Banana', options: ['Outra fruta'] }],
  },
  {
    id: 'almoco', name: 'Almoço', time: '12:30',
    items: (t) => ['150 g de frango ou patinho', t ? '150 g de arroz cozido' : '120 g de arroz cozido',
      '80 g de feijão', 'Salada à vontade', '1 colher de chá de azeite'],
    kcal: { t: 520, r: 480 }, prot: { t: 54, r: 53 },
    swaps: [
      { label: 'Proteína', from: 'Frango/patinho', options: ['Frango', 'Patinho', 'Peixe', 'Ovos'] },
      { label: 'Carboidrato', from: 'Arroz', options: ['Batata-doce', 'Macarrão', 'Cuscuz'] },
    ],
  },
  {
    id: 'lanche', name: 'Lanche', time: '16:00',
    items: () => ['1 iogurte grego natural (170 g)', '1 fruta'],
    kcal: { t: 180, r: 180 }, prot: { t: 15, r: 15 },
    swaps: [],
  },
  {
    id: 'jantar', name: 'Jantar', time: '20:00',
    items: () => ['Hambúrguer de 150 g de patinho moído', '1 pão de hambúrguer', '1 fatia de queijo',
      'Alface, tomate e cebola', 'Salada'],
    kcal: { t: 560, r: 560 }, prot: { t: 50, r: 50 },
    swaps: [
      { label: 'Proteína', from: 'Patinho', options: ['Frango', 'Peixe', 'Ovos'] },
    ],
  },
];

export const DOCE = {
  id: 'doce', name: 'Docinho do dia', kcal: 60, prot: 1,
  options: ['1 suspiro', '1 colher de doce de leite (~25 g)'],
};

export const SWAP_RULES = [
  'Frango, patinho, peixe e ovos entre si.',
  'Arroz, batata-doce, macarrão e cuscuz na mesma quantidade cozida.',
];

// ---------- Treino ----------
// comp = composto (descanso longo); bw = sem carga; unit 's' = segundos
export const EXERCISES = {
  supino_reto: { name: 'Supino reto com halteres', sets: 4, reps: [6, 8], comp: true, note: 'Pegada neutra. Desça controlado. Pare se doer.' },
  remada_curvada: { name: 'Remada curvada', sets: 4, reps: [8, 10], comp: true },
  desenvolvimento: { name: 'Desenvolvimento com halteres', sets: 3, reps: [8, 10], comp: true, note: 'Pegada neutra. Desça controlado. Pare se doer.' },
  puxada_frontal: { name: 'Puxada frontal', sets: 3, reps: [10, 12] },
  elev_lateral: { name: 'Elevação lateral', sets: 3, reps: [12, 15] },
  triceps_corda: { name: 'Tríceps corda', sets: 3, reps: [10, 12] },
  rosca_direta: { name: 'Rosca direta', sets: 3, reps: [10, 12] },

  agachamento: { name: 'Agachamento livre ou Smith', sets: 4, reps: [6, 8], comp: true },
  leg_press: { name: 'Leg press', sets: 3, reps: [10, 12], comp: true },
  stiff: { name: 'Stiff', sets: 3, reps: [8, 10], comp: true },
  extensora: { name: 'Cadeira extensora', sets: 3, reps: [12, 15] },
  pant_pe: { name: 'Panturrilha em pé', sets: 4, reps: [10, 15] },
  prancha: { name: 'Prancha', sets: 3, reps: [40, 40], unit: 's', bw: true },

  barra_fixa: { name: 'Barra fixa ou puxada aberta', sets: 4, reps: [6, 10], comp: true },
  supino_incl: { name: 'Supino inclinado com halteres', sets: 4, reps: [8, 10], comp: true, note: 'Pegada neutra. Desça controlado. Pare se doer.' },
  remada_baixa: { name: 'Remada baixa triângulo', sets: 3, reps: [10, 12] },
  crucifixo: { name: 'Crucifixo ou crossover', sets: 3, reps: [12, 15] },
  face_pull: { name: 'Face pull', sets: 3, reps: [15, 15] },
  rosca_martelo: { name: 'Rosca martelo', sets: 3, reps: [10, 12] },
  triceps_testa: { name: 'Tríceps testa', sets: 3, reps: [10, 12] },

  terra_romeno: { name: 'Terra romeno', sets: 4, reps: [6, 8], comp: true },
  afundo: { name: 'Afundo ou búlgaro', sets: 3, reps: [10, 10], comp: true, perSide: true },
  flexora: { name: 'Mesa flexora', sets: 3, reps: [10, 12] },
  hip_thrust: { name: 'Hip thrust', sets: 3, reps: [8, 12], comp: true },
  pant_sentada: { name: 'Panturrilha sentada', sets: 4, reps: [12, 15] },
  abdominal: { name: 'Abdominal', sets: 3, reps: [10, 15], bw: true },

  // Trocas do "ombro doeu"
  supino_incl_troca: { name: 'Supino inclinado com halteres (troca)', sets: 4, reps: [8, 10], comp: true, note: 'No lugar do supino reto. Pegada neutra.' },
  elev_lateral_troca: { name: 'Elevação lateral (troca)', sets: 3, reps: [12, 15], note: 'No lugar do desenvolvimento.' },
};

export const SHOULDER_SWAPS = { supino_reto: 'supino_incl_troca', desenvolvimento: 'elev_lateral_troca' };

export const WORKOUTS = {
  supA: { name: 'Superior A', kind: 'forca', ex: ['supino_reto', 'remada_curvada', 'desenvolvimento', 'puxada_frontal', 'elev_lateral', 'triceps_corda', 'rosca_direta'] },
  infA: { name: 'Inferior A', kind: 'forca', ex: ['agachamento', 'leg_press', 'stiff', 'extensora', 'pant_pe', 'prancha'] },
  supB: { name: 'Superior B', kind: 'forca', ex: ['barra_fixa', 'supino_incl', 'remada_baixa', 'crucifixo', 'face_pull', 'rosca_martelo', 'triceps_testa'] },
  infB: { name: 'Inferior B', kind: 'forca', ex: ['terra_romeno', 'afundo', 'flexora', 'hip_thrust', 'pant_sentada', 'abdominal'] },
  z2: { name: 'Aeróbico Zona 2', kind: 'cardio' },
  run: { name: 'Corrida com intervalos', kind: 'cardio' },
  walk: { name: 'Caminhada leve', kind: 'cardio' },
};

// getDay(): 0=dom ... 6=sáb
export const WEEK_PLAN = { 0: 'walk', 1: 'supA', 2: 'infA', 3: 'z2', 4: 'supB', 5: 'infB', 6: 'run' };

export const WEEK_GUIDE = [
  { rir: '3 na reserva', text: '3 séries em tudo. Carga leve, foco em técnica.' },
  { rir: '2 na reserva', text: 'Séries completas.' },
  { rir: '1–2 na reserva', text: 'Séries completas. Bateu o topo das reps em todas? Suba a carga.' },
  { rir: '0–1 na reserva', text: 'Última série dos compostos até 0–1 na reserva, sem perder a técnica.' },
];

export const WARMUP = [
  { id: 'bike', label: '5 min de bike ou esteira' },
  { id: 'leves', label: '2 séries leves do 1º exercício' },
];

export const CLOSING = [
  { id: 'along', label: 'Alongamento 5 min' },
  { id: 'whey', label: 'Whey + pós-treino' },
];

const m = (x) => x * 60;

// Planos de aeróbico. segs: {label, sec, type}. mode 'stopwatch' = cronômetro crescente.
export function cardioPlan(type, week) {
  if (type === 'z2') {
    return {
      title: 'Zona 2 + core', mode: 'segments',
      desc: '40 min em ritmo de conversa (120–140 bpm) + 10 min de core.',
      segs: [{ label: 'Zona 2', sec: m(40), type: 'z2', hint: '120–140 bpm · ritmo de conversa' }, { label: 'Core', sec: m(10), type: 'core', hint: 'Prancha, abdominal, ponte' }],
      checks: [{ id: 'z2', label: '40 min Zona 2 (120–140 bpm)' }, { id: 'core', label: '10 min de core' }],
    };
  }
  if (type === 'brisk') {
    return {
      title: 'Caminhada rápida', mode: 'segments', desc: '45 min de caminhada rápida.',
      segs: [{ label: 'Caminhada rápida', sec: m(45), type: 'walk' }],
      checks: [], log: true,
    };
  }
  if (type === 'walk') {
    return {
      title: 'Caminhada leve', mode: 'stopwatch', desc: '30 a 40 min, leve.',
      goal: '30–40 min', alerts: [m(30), m(40)], segs: [], checks: [], log: true,
    };
  }
  // run
  const W = (s) => ({ label: 'Caminhada', sec: m(s), type: 'walk' });
  const R = (s) => ({ label: 'Corrida leve', sec: m(s), type: 'run' });
  const block = (n, run, walk) => {
    const out = [];
    for (let i = 1; i <= n; i++) out.push({ ...R(run), round: `${i} de ${n}` }, { ...W(walk), round: `${i} de ${n}` });
    return out;
  };
  const warm = { ...W(5), label: 'Caminhada (aquecer)' };
  const cool = { ...W(5), label: 'Caminhada (soltar)' };
  if (week === 1) return { title: 'Corre/anda', mode: 'segments', desc: '5 min andando + 6 × (1 min correndo leve / 2 min andando) + 5 min andando.', segs: [warm, ...block(6, 1, 2), cool], checks: [], log: true };
  if (week === 2) return { title: 'Corre/anda', mode: 'segments', desc: '5 min andando + 6 × (2 min correndo / 2 min andando) + 5 min andando.', segs: [warm, ...block(6, 2, 2), cool], checks: [], log: true };
  if (week === 3) return { title: 'Corre/anda', mode: 'segments', desc: '5 min andando + 5 × (4 min correndo / 1 min andando) + 5 min andando.', segs: [warm, ...block(5, 4, 1), cool], checks: [], log: true };
  return { title: 'Teste de 5 km', mode: 'stopwatch', desc: 'Corra o máximo que conseguir sem parar. Meta realista: 31 a 34 min.', goal: '31–34 min', alerts: [], segs: [], checks: [], log: true, test: true };
}
