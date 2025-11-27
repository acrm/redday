export type Probability = 'Low' | 'Medium' | 'High' | '';

export interface Profile {
  id: string;
  name: string;
  color: string;
  startISO: string | null;
  editMode?: boolean;
}

export interface AppState {
  name: string;
  icon: string;
  password: string;
  profiles: Profile[];
  activeId: string | null;
  monthISO: string;
  monthSISO: string;
}

export interface FlagsForDateResult {
  m: boolean;
  p: boolean;
  o: boolean;
  pmsInt: number;
  prob: 'Low' | 'Medium' | 'High' | '';
  phase: string;
}

export const STORAGE_KEY = 'redday_full_poc_v8';
export const COLORS = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#e11d48'];

export const fmtISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseISO = (s: string): Date => {
  const [a, b, c] = s.split('-').map(Number);
  return new Date(a, b - 1, c);
};

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const diffDays = (a: Date, b: Date): number => Math.floor((+a - +b) / 86400000);

export interface CycleModel {
  start: Date;
  endM: Date;
  ov: Date;
  nextStart: Date;
  pmsStart: Date;
  pmsEnd: Date;
}

export const modelForDate = (date: Date, baseStart: Date): CycleModel => {
  const delta = diffDays(date, baseStart);
  const k = Math.floor(delta / 28);
  const start = addDays(baseStart, k * 28);
  const endM = addDays(start, 4);
  const ov = addDays(endM, 9);
  const nextStart = addDays(start, 28);
  const pmsStart = addDays(nextStart, -7);
  const pmsEnd = addDays(nextStart, -1);
  return { start, endM, ov, nextStart, pmsStart, pmsEnd };
};

export const flagsForDate = (date: Date, baseStart: Date | null): FlagsForDateResult & { model?: CycleModel } => {
  if (!baseStart) {
    return { m: false, p: false, o: false, pmsInt: 0, prob: '', phase: '' };
  }
  const model = modelForDate(date, baseStart);
  const isM = date >= model.start && date <= model.endM;
  const isO = fmtISO(date) === fmtISO(model.ov);
  const isP = date >= model.pmsStart && date <= model.pmsEnd;

  let prob: Probability = 'Low';
  const d5 = addDays(model.start, 4);
  const d7 = addDays(model.start, 6);

  if (date >= addDays(model.ov, -1) && date <= addDays(model.ov, 1)) {
    prob = 'High';
  } else if ((date >= d5 && date <= d7) || fmtISO(date) === fmtISO(addDays(model.ov, 2))) {
    prob = 'Medium';
  }

  const daysToNext = diffDays(model.nextStart, date);
  const pmsInt = isP ? Math.max(1, Math.min(7, 8 - daysToNext)) : 0;

  let phase = '';
  if (isM) {
    phase = 'М';
  } else if (isP) {
    phase = 'ПМС';
  } else if (isO) {
    phase = 'ОВУ';
  } else {
    if (prob === 'High') phase = 'Выс.';
    else if (prob === 'Medium') phase = 'Ср.';
    else if (prob === 'Low') phase = 'Низк.';
  }

  return { m: isM, p: isP, o: isO, pmsInt, prob, phase, model };
};

export const nextColor = (profiles: Profile[]): string => {
  const used = profiles.map((p) => p.color);
  for (const c of COLORS) {
    if (!used.includes(c)) return c;
  }
  return COLORS[profiles.length % COLORS.length];
};

export const createInitialState = (): AppState => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const id = `p_${Math.random().toString(36).slice(2)}`;

  const profile: Profile = {
    id,
    name: 'New profile',
    color: COLORS[0],
    startISO: null,
    editMode: true,
  };

  return {
    name: 'RedDay',
    icon: '📅',
    password: '',
    profiles: [profile],
    activeId: id,
    monthISO: fmtISO(monthStart),
    monthSISO: fmtISO(monthStart),
  };
};

export const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.profiles || parsed.profiles.length === 0) {
      return createInitialState();
    }
    if (!parsed.activeId || !parsed.profiles.find((p) => p.id === parsed.activeId)) {
      parsed.activeId = parsed.profiles[0].id;
    }
    return parsed;
  } catch {
    return createInitialState();
  }
};

export const saveState = (state: AppState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getActiveProfile = (state: AppState): Profile => {
  return state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0];
};

export const addProfileToState = (state: AppState): AppState => {
  const profile: Profile = {
    id: `p_${Math.random().toString(36).slice(2)}`,
    name: 'New profile',
    color: nextColor(state.profiles),
    startISO: null,
    editMode: true,
  };
  return {
    ...state,
    profiles: [...state.profiles, profile],
    activeId: profile.id,
  };
};

export const deleteProfileFromState = (state: AppState, id: string): AppState => {
  const remaining = state.profiles.filter((p) => p.id !== id);
  if (remaining.length === 0) {
    return createInitialState();
  }
  const idx = state.profiles.findIndex((p) => p.id === id);
  const prevIndex = Math.max(0, idx - 1);
  const newActive = remaining[prevIndex]?.id ?? remaining[0].id;
  return {
    ...state,
    profiles: remaining,
    activeId: newActive,
  };
};
