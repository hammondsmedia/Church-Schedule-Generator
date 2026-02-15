// src/components/tabs/CalendarTab.jsx
import React from 'react';
import { getMonthDays } from '../../utils/scheduleLogic';

export default function CalendarTab({ 
  selectedMonth, setSelectedMonth, schedule, serviceSettings, userRole, setAssigningSlot, setEditingNote, getSpeakerName 
}) {
  const days = getMonthDays(selectedMonth);
  const isAdmin = ['owner', 'admin'].includes(userRole);

  const ServiceBar = ({ type, dk, date }) => {
    const setting = serviceSettings[type];
    if (!setting?.enabled) return null;
    const assignment = schedule[`${dk}-${type}`];
    const speakerName = getSpeakerName(assignment?.speakerId);

    const typeColors = {
        sundayMorning: '#dbeafe',
        communion: '#fce7f3',
        sundayEvening: '#ede9fe',
        wednesdayEvening: '#d1fae5'
    };

    return (
      <button 
        className={`calendar-bar ${speakerName ? '' : 'bar-empty'}`}
        style={speakerName ? { background: typeColors[type], color: '#1e3a5f', border: 'none' } : {}}
        onClick={() => {
            if (assignment) setEditingNote({ slotKey: `${dk}-${type}`, ...assignment });
            else if (isAdmin) setAssigningSlot({ slotKey: `${dk}-${type}`, date: dk, serviceType: type });
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{speakerName || (isAdmin ? '+ Assign' : '—')}</span>
        </div>
        {assignment?.note && <div style={{ fontSize: '9px', opacity: 0.7, fontStyle: 'italic' }}>{assignment.note}</div>}
      </button>
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>←</button>
        <h3 style={{ margin: 0, fontWeight: '800' }}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>→</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid #eee' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#e2e8f0', gap: '1px' }}>
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dk = date.toISOString().split('T')[0];
          const isToday = new Date().toISOString().split('T')[0] === dk;

          return (
            <div key={idx} style={{ minHeight: '130px', background: isCurrentMonth ? 'white' : '#f8fafc', padding: '8px', opacity: isCurrentMonth ? 1 : 0.5 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: isToday ? '#1e3a5f' : '#64748b' }}>
                {date.getDate()}
              </div>
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
