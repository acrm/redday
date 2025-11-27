import React, { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  createInitialState,
  loadState,
  saveState,
  getActiveProfile,
  fmtISO,
  parseISO,
  addDays,
  flagsForDate,
  addProfileToState,
  deleteProfileFromState,
} from '../logic';

const fmtMonth = (d: Date): string => {
  const s = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(d);
  return s[0].toUpperCase() + s.slice(1);
};

const fmtDate = (d: Date): string =>
  new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long' }).format(d);

type TabKey = 'cal' | 'sum' | 'set';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<TabKey>('cal');
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(`${'redday_full_poc_v8'}:unlocked`) === '1';
    } catch {
      return true;
    }
  });
  const [lockInput, setLockInput] = useState('');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const active = useMemo(() => getActiveProfile(state), [state]);

  const monthDate = useMemo(() => parseISO(state.monthISO), [state.monthISO]);
  const monthSDate = useMemo(() => parseISO(state.monthSISO), [state.monthSISO]);

  const today = useMemo(() => new Date(), []);

  const baseStart = active.startISO ? parseISO(active.startISO) : null;
  const todayFlags = flagsForDate(today, baseStart);
  const headerModel = baseStart
    ? flagsForDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), baseStart).model
    : undefined;

  const handleChangeMonth = (delta: number) => {
    setState((prev) => {
      const current = parseISO(prev.monthISO);
      const next = new Date(current.getFullYear(), current.getMonth() + delta, 1);
      return { ...prev, monthISO: fmtISO(next) };
    });
  };

  const handleChangeMonthS = (delta: number) => {
    setState((prev) => {
      const current = parseISO(prev.monthSISO);
      const next = new Date(current.getFullYear(), current.getMonth() + delta, 1);
      return { ...prev, monthSISO: fmtISO(next) };
    });
  };

  const handleAddProfile = () => {
    setState((prev) => addProfileToState(prev));
  };

  const handleDeleteProfile = (id: string) => {
    setState((prev) => deleteProfileFromState(prev, id));
  };

  const handleUpdateProfile = (id: string, updates: Partial<typeof active>) => {
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  };

  const handleSetActive = (id: string) => {
    setState((prev) => ({ ...prev, activeId: id }));
  };

  const handleClickDay = (date: Date) => {
    if (!active.editMode) return;
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === active.id ? { ...p, startISO: fmtISO(date), editMode: false } : p,
      ),
    }));
  };

  const handleToggleEditMode = () => {
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === active.id ? { ...p, editMode: true } : p,
      ),
    }));
  };

  const handleSaveSettings = () => {
    setState((prev) => ({ ...prev }));
    alert('Saved (PoC)');
  };

  const handleUnlock = () => {
    if (lockInput === state.password) {
      try {
        sessionStorage.setItem(`${'redday_full_poc_v8'}:unlocked`, '1');
      } catch {
        // ignore
      }
      setUnlocked(true);
    }
  };

  const isEditing = !!active.editMode;

  return (
    <div className={isEditing ? 'app app--editing' : 'app'}>
      <div className="app__card">
        <div className="app__topbar">
          <div className="app__title">
            <span style={{ fontSize: 20 }}>{state.icon || '📅'}</span>
            <h1 style={{ margin: 0, fontSize: 18 }}>{state.name || 'RedDay'}</h1>
          </div>
          <div className="app__tabs">
            <div
              className={tab === 'cal' ? 'tabs__item tabs__item--active' : 'tabs__item'}
              onClick={() => setTab('cal')}
            >
              Профили
            </div>
            <div
              className={tab === 'sum' ? 'tabs__item tabs__item--active' : 'tabs__item'}
              onClick={() => setTab('sum')}
            >
              Сводка
            </div>
            <div
              className={tab === 'set' ? 'tabs__item tabs__item--active' : 'tabs__item'}
              onClick={() => setTab('set')}
            >
              Настройки
            </div>
          </div>
        </div>

        {tab === 'cal' && (
          <div className="panel">
            <div className="profiles__row">
              <div className="profiles__list">
                {state.profiles.map((p, idx) => {
                  const canDelete = state.profiles.length > 1;
                  const isActive = p.id === active.id;
                  const isEditingProfile = p.editMode;

                  return (
                    <div
                      key={p.id}
                      className={isActive ? 'profile-pill profile-pill--active' : 'profile-pill'}
                      onClick={() => !isEditingProfile && handleSetActive(p.id)}
                    >
                      <span className="profile-pill__dot" style={{ background: p.color }} />
                      {isEditingProfile ? (
                        <>
                          <input
                            type="text"
                            value={p.name}
                            className="profile-pill__input"
                            onChange={(e) =>
                              handleUpdateProfile(p.id, { name: e.target.value || 'New profile' })
                            }
                          />
                          <input
                            type="color"
                            value={p.color}
                            onChange={(e) => handleUpdateProfile(p.id, { color: e.target.value })}
                          />
                          <span
                            className="profile-pill__icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateProfile(p.id, { editMode: false });
                            }}
                          >
                            ✓
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{p.name}</span>
                          <span
                            className="profile-pill__icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateProfile(p.id, { editMode: true });
                            }}
                          >
                            ✎
                          </span>
                          {canDelete && (
                            <span
                              className="profile-pill__icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProfile(p.id);
                              }}
                            >
                              🗑
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div>
                <button className="btn btn--small" onClick={handleAddProfile}>
                  + Профиль
                </button>
              </div>
            </div>

            <div className="info-grid">
              <div className="info-grid__box">
                <b className="info-grid__box-label">Профиль</b>
                <div className="info-grid__box-value">{active.name}</div>
              </div>
              <div className="info-grid__box">
                <b className="info-grid__box-label">Начало мес.</b>
                <div className="info-grid__box-value">
                  {headerModel ? fmtDate(headerModel.start) : '—'}
                </div>
              </div>
              <div className="info-grid__box">
                <b className="info-grid__box-label">Овуляция</b>
                <div className="info-grid__box-value">{headerModel ? fmtDate(headerModel.ov) : '—'}</div>
              </div>
              <div className="info-grid__box">
                <b className="info-grid__box-label">Вероятность сегодня</b>
                <div className="info-grid__box-value">
                  {baseStart
                    ? todayFlags.prob === 'High'
                      ? 'Высокая'
                      : todayFlags.prob === 'Medium'
                      ? 'Средняя'
                      : 'Низкая'
                    : '—'}
                </div>
              </div>
            </div>

            <Calendar
              monthDate={monthDate}
              profiles={state.profiles}
              activeId={active.id}
              onChangeMonth={handleChangeMonth}
              onClickDay={handleClickDay}
              onToggleEdit={handleToggleEditMode}
            />
          </div>
        )}

        {tab === 'sum' && (
          <div className="panel">
            <Summary
              monthDate={monthSDate}
              profiles={state.profiles}
              onChangeMonth={handleChangeMonthS}
            />
          </div>
        )}

        {tab === 'set' && (
          <div className="panel">
            <Settings
              state={state}
              onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
              onSave={handleSaveSettings}
            />
          </div>
        )}
      </div>

      {!unlocked && state.password && (
        <div className="lock">
          <div className="box">
            <div>
              <b>RedDay защищён паролем</b>
            </div>
            <div className="row">
              <input
                type="password"
                placeholder="Пароль"
                value={lockInput}
                onChange={(e) => setLockInput(e.target.value)}
              />
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleUnlock}>
                Войти
              </button>
            </div>
            <div className="muted">PoC: local simulation</div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CalendarProps {
  monthDate: Date;
  profiles: AppState['profiles'];
  activeId: string;
  onChangeMonth: (delta: number) => void;
  onClickDay: (date: Date) => void;
  onToggleEdit: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ monthDate, profiles, activeId, onChangeMonth, onClickDay, onToggleEdit }) => {
  const active = profiles.find((p) => p.id === activeId)!;
  const hasStart = !!active.startISO;
  const baseStart = hasStart ? parseISO(active.startISO!) : null;

  const days = useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startIdx = (first.getDay() + 6) % 7;
    const dim = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const cells: { date: Date; out: boolean }[] = [];

    for (let i = 0; i < startIdx; i += 1) {
      cells.push({ date: addDays(first, i - startIdx), out: true });
    }
    for (let d = 1; d <= dim; d += 1) {
      cells.push({ date: new Date(monthDate.getFullYear(), monthDate.getMonth(), d), out: false });
    }
    const rem = cells.length % 7;
    if (rem !== 0) {
      const extra = 7 - rem;
      for (let i = 1; i <= extra; i += 1) {
        cells.push({
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), dim + i),
          out: true,
        });
      }
    }
    return cells;
  }, [monthDate]);

  return (
    <div className="calendar__wrap">
      <div className="calendar__head">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn--small" onClick={() => onChangeMonth(-1)}>
            ◀
          </button>
          <h3 style={{ margin: 0 }}>{fmtMonth(monthDate)}</h3>
          <button className="btn btn--small" onClick={() => onChangeMonth(1)}>
            ▶
          </button>
        </div>
        <button className="btn btn--small" onClick={onToggleEdit}>
          Указать
        </button>
      </div>

      <div className="calendar__grid" style={{ marginBottom: 4 }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((t) => (
          <div key={t} className="calendar__dow">
            {t}
          </div>
        ))}
      </div>
      <div className="calendar__grid">
        {days.map((c) => {
          const flags = flagsForDate(c.date, baseStart);

          return (
            <div
              key={c.date.toISOString()}
              className={c.out ? 'day day--out' : 'day'}
              onClick={() => onClickDay(c.date)}
            >
              <div className="day__num">{c.date.getDate()}</div>
              {baseStart && flags.phase && (
                <div className="day__phase">
                  {flags.phase}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SummaryProps {
  monthDate: Date;
  profiles: AppState['profiles'];
  onChangeMonth: (delta: number) => void;
}

const Summary: React.FC<SummaryProps> = ({ monthDate, profiles, onChangeMonth }) => {
  const days = useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startIdx = (first.getDay() + 6) % 7;
    const dim = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const cells: { date: Date; out: boolean }[] = [];

    for (let i = 0; i < startIdx; i += 1) {
      cells.push({ date: addDays(first, i - startIdx), out: true });
    }
    for (let d = 1; d <= dim; d += 1) {
      cells.push({ date: new Date(monthDate.getFullYear(), monthDate.getMonth(), d), out: false });
    }
    const rem = cells.length % 7;
    if (rem !== 0) {
      const extra = 7 - rem;
      for (let i = 1; i <= extra; i += 1) {
        cells.push({
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), dim + i),
          out: true,
        });
      }
    }
    return cells;
  }, [monthDate]);

  return (
    <>
      <div className="calendar__head">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn--small" onClick={() => onChangeMonth(-1)}>
            ◀
          </button>
          <h3 style={{ margin: 0 }}>{fmtMonth(monthDate)}</h3>
          <button className="btn btn--small" onClick={() => onChangeMonth(1)}>
            ▶
          </button>
        </div>
      </div>
      <div className="calendar__wrap">
        <div className="calendar__grid" style={{ marginBottom: 4 }}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((t) => (
            <div key={t} className="calendar__dow">
              {t}
            </div>
          ))}
        </div>
        <div className="calendar__grid">
          {days.map((c) => (
            <div key={c.date.toISOString()} className={c.out ? 'day day--out' : 'day'}>
              <div className="day__num">{c.date.getDate()}</div>
              <div className="day__phase-multi">
                {profiles.map((p) => {
                  if (!p.startISO) return null;
                  const base = parseISO(p.startISO);
                  const flags = flagsForDate(c.date, base);
                  if (!flags.phase) return null;
                  return (
                    <span key={p.id} style={{ color: p.color }}>
                      {flags.phase}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

interface SettingsProps {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
  onSave: () => void;
}

const Settings: React.FC<SettingsProps> = ({ state, onChange, onSave }) => {
  return (
    <>
      <div className="row">
        <label>Название</label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value || 'RedDay' })}
        />
      </div>
      <div className="row">
        <label>Иконка</label>
        <select
          value={state.icon}
          onChange={(e) => onChange({ icon: e.target.value })}
        >
          <option>📅</option>
          <option>📆</option>
          <option>🗓️</option>
          <option>📘</option>
          <option>✅</option>
        </select>
      </div>
      <div className="row">
        <label>Пароль (PoC)</label>
        <input
          type="password"
          placeholder="не обязат."
          value={state.password}
          onChange={(e) => onChange({ password: e.target.value })}
        />
      </div>
      <div className="row">
        <button className="btn" onClick={onSave}>
          Сохранить
        </button>
        <span className="muted">Demo: data stored in localStorage</span>
      </div>
    </>
  );
};
