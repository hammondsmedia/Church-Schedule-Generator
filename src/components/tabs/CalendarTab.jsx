// src/components/tabs/CalendarTab.jsx
import React from 'react';
import { getMonthDays } from '../../utils/scheduleLogic';

const EditIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// Service type colors
const SERVICE_COLORS = {
  sundayMorning:    { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  communion:        { bg: '#fce7f3', color: '#be185d', dot: '#ec4899' },
  sundayEvening:    { bg: '#ede9fe', color: '#5b21b6', dot: '#8b5cf6' },
  wednesdayEvening: { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
};

export default function CalendarTab({
  selectedMonth, schedule, serviceSettings, userRole, setAssigningSlot, setEditingNote, getSpeakerName
}) {
  const days = getMonthDays(selectedMonth);
  const isAdmin = ['owner', 'admin'].includes(userRole);

  const getShortLabel = (type) => {
    if (type === 'communion') return 'Communion';
    const setting = serviceSettings[type];
    if (!setting?.enabled) return '';
    // Short label: remove "Sunday" / "Wednesday" from label when inside that day's column
    return setting.label;
  };

  const getTimeLabel = (type) => {
    if (type === 'communion') return '';
    const setting = serviceSettings[type];
    return setting?.enabled && setting.time ? setting.time : '';
  };

  const sundays = days.filter(d => d.isCurrentMonth && d.date.getDay() === 0);
  const wednesdays = days.filter(d => d.isCurrentMonth && d.date.getDay() === 3);

  const formatDay = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const ServiceBar = ({ slotKey, slot, type, isAdmin, onClick }) => {
    const colors = SERVICE_COLORS[type] || SERVICE_COLORS.sundayMorning;
    const hasSlot = !!slot;
    const label = getShortLabel(type);
    const time = getTimeLabel(type);

    if (hasSlot) {
      return (
        <button
          className="calendar-bar"
          style={{ background: colors.bg, color: colors.color }}
          onClick={onClick}
        >
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, letterSpacing: '0.02em' }}>
              {label}{time ? ` · ${time}` : ''}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {getSpeakerName(slot.speakerId)}
            </span>
          </span>
          <EditIcon />
        </button>
      );
    }

    // Empty slot
    if (isAdmin) {
      return (
        <button
          className="calendar-bar bar-empty"
          onClick={onClick}
        >
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.6, letterSpacing: '0.02em' }}>
              {label}{time ? ` · ${time}` : ''}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>+ Assign</span>
          </span>
          <PlusIcon />
        </button>
      );
    }

    return (
      <div className="calendar-bar bar-empty" style={{ cursor: 'default', pointerEvents: 'none' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.6 }}>{label}{time ? ` · ${time}` : ''}</span>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Unassigned</span>
        </span>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Column headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1, padding: '14px 20px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>Sundays</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{sundays.length} this month</span>
        </div>
        <div style={{ flex: 1, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>Wednesdays</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{wednesdays.length} this month</span>
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* SUNDAY COLUMN */}
        <div style={{ flex: '1 1 280px', borderRight: '1px solid var(--border)' }}>
          {sundays.map(d => {
            const k = d.date.toISOString().split('T')[0];
            const sm = schedule[k + '-sundayMorning'];
            const c  = schedule[k + '-communion'];
            const se = schedule[k + '-sundayEvening'];
            const isToday = k === new Date().toISOString().split('T')[0];

            return (
              <div key={k} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14, flexShrink: 0,
                    background: isToday ? 'var(--primary)' : 'transparent',
                    color: isToday ? 'white' : 'var(--text)',
                    letterSpacing: '-0.02em',
                  }}>
                    {d.date.getDate()}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                    {d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(/[A-Za-z]+,\s/, '')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {serviceSettings.sundayMorning?.enabled && (
                    <ServiceBar
                      slotKey={k + '-sundayMorning'} slot={sm} type="sundayMorning" isAdmin={isAdmin}
                      onClick={() => sm
                        ? setEditingNote({ slotKey: k + '-sundayMorning', ...sm })
                        : isAdmin && setAssigningSlot({ slotKey: k + '-sundayMorning', date: k, serviceType: 'sundayMorning' })}
                    />
                  )}
                  {serviceSettings.communion?.enabled && (
                    <ServiceBar
                      slotKey={k + '-communion'} slot={c} type="communion" isAdmin={isAdmin}
                      onClick={() => c
                        ? setEditingNote({ slotKey: k + '-communion', ...c })
                        : isAdmin && setAssigningSlot({ slotKey: k + '-communion', date: k, serviceType: 'communion' })}
                    />
                  )}
                  {serviceSettings.sundayEvening?.enabled && (
                    <ServiceBar
                      slotKey={k + '-sundayEvening'} slot={se} type="sundayEvening" isAdmin={isAdmin}
                      onClick={() => se
                        ? setEditingNote({ slotKey: k + '-sundayEvening', ...se })
                        : isAdmin && setAssigningSlot({ slotKey: k + '-sundayEvening', date: k, serviceType: 'sundayEvening' })}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* WEDNESDAY COLUMN */}
        <div style={{ flex: '1 1 280px' }}>
          {wednesdays.map(d => {
            const k = d.date.toISOString().split('T')[0];
            const w = schedule[k + '-wednesdayEvening'];
            const isToday = k === new Date().toISOString().split('T')[0];

            return (
              <div key={k} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14, flexShrink: 0,
                    background: isToday ? 'var(--primary)' : 'transparent',
                    color: isToday ? 'white' : 'var(--text)',
                    letterSpacing: '-0.02em',
                  }}>
                    {d.date.getDate()}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                    {d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {serviceSettings.wednesdayEvening?.enabled && (
                    <ServiceBar
                      slotKey={k + '-wednesdayEvening'} slot={w} type="wednesdayEvening" isAdmin={isAdmin}
                      onClick={() => w
                        ? setEditingNote({ slotKey: k + '-wednesdayEvening', ...w })
                        : isAdmin && setAssigningSlot({ slotKey: k + '-wednesdayEvening', date: k, serviceType: 'wednesdayEvening' })}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
