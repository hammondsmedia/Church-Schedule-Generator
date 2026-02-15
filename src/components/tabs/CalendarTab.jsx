// src/components/tabs/CalendarTab.jsx
import React from 'react';
import { getMonthDays } from '../../utils/scheduleLogic';

export default function CalendarTab({ 
  selectedMonth, setSelectedMonth, schedule, serviceSettings, userRole, setAssigningSlot, setEditingNote, getSpeakerName 
}) {
  const days = getMonthDays(selectedMonth);
  const isAdmin = ['owner', 'admin'].includes(userRole);

  const getTimeLabel = (type) => {
    // RESTORED: Label for Communion
    if (type === 'communion') return 'Communion — ';
    const setting = serviceSettings[type];
    return setting && setting.enabled && setting.time ? `${setting.time} — ` : '';
  };

  const ServiceBar = ({ type, dk, date }) => {
    const setting = serviceSettings[type];
    if (!setting?.enabled) return null;
    const slotKey = `${dk}-${type}`;
    const assignment = schedule[slotKey];
    const speakerName = getSpeakerName(assignment?.speakerId);

    const typeColors = {
      sundayMorning: { bg: '#dbeafe', text: '#1e40af' },
      communion: { bg: '#fce7f3', text: '#be185d' }, // PINK
      sundayEvening: { bg: '#ede9fe', text: '#5b21b6' },
      wednesdayEvening: { bg: '#d1fae5', text: '#065f46' }
    };
    const color = typeColors[type] || { bg: '#f3f4f6', text: '#374151' };

    return (
      <button 
        className={`calendar-bar ${speakerName ? '' : 'bar-empty'}`}
        style={speakerName ? { background: color.bg, color: color.text, border: 'none' } : {}}
        onClick={() => {
          if (assignment) setEditingNote({ slotKey, ...assignment });
          else if (isAdmin) setAssigningSlot({ slotKey, date: dk, serviceType: type });
        }}
      >
        <span>{getTimeLabel(type)}{speakerName || (isAdmin ? '+ Assign' : '—')}</span>
        {assignment?.note && <div style={{ fontSize: '9px', opacity: 0.7, fontStyle: 'italic' }}>{assignment.note}</div>}
      </button>
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Grid Headers Omitted for Length - Same as Previous */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#e2e8f0', gap: '1px' }}>
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dk = date.toISOString().split('T')[0];
          return (
            <div key={idx} style={{ minHeight: '130px', background: isCurrentMonth ? 'white' : '#f8fafc', padding: '8px', opacity: isCurrentMonth ? 1 : 0.5 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>{date.getDate()}</div>
              <ServiceBar type="sundayMorning" dk={dk} date={date} />
              <ServiceBar type="communion" dk={dk} date={date} />
              <ServiceBar type="sundayEvening" dk={dk} date={date} />
              <ServiceBar type="wednesdayEvening" dk={dk} date={date} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
