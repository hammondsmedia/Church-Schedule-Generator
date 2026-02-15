// src/components/tabs/CalendarTab.jsx
import React from 'react';
import { getMonthDays } from '../../utils/scheduleLogic';

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

export default function CalendarTab({ 
  selectedMonth, schedule, serviceSettings, userRole, setAssigningSlot, setEditingNote, getSpeakerName 
}) {
  const days = getMonthDays(selectedMonth);
  const isAdmin = ['owner', 'admin'].includes(userRole);

  const getTimeLabel = (type) => {
    if (type === 'communion') return 'Communion — ';
    const setting = serviceSettings[type];
    return setting && setting.enabled && setting.time ? `${setting.time} — ` : '';
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
      {/* SUNDAY COLUMN */}
      <div style={{ flex: '1 1 300px', borderRight: '1px solid #eee' }}>
        <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold', color: '#1e3a5f' }}>Sundays</div>
        {days.filter(d => d.isCurrentMonth && d.date.getDay() === 0).map(d => {
          const k = d.date.toISOString().split('T')[0];
          const sm = schedule[k + '-sundayMorning'], c = schedule[k + '-communion'], se = schedule[k + '-sundayEvening'];
          return (
            <div key={k} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e3a5f' }}>{d.date.getDate()}</div>
              {serviceSettings.sundayMorning.enabled && (
                <button className={'calendar-bar ' + (sm ? '' : 'bar-empty')} style={sm ? {background: '#dbeafe', color: '#1e40af'} : {}} onClick={() => sm ? setEditingNote({ slotKey: k + '-sundayMorning', ...sm }) : isAdmin && setAssigningSlot({ slotKey: k + '-sundayMorning', date: k, serviceType: 'sundayMorning' })}>
                  <span>{getTimeLabel('sundayMorning')}{sm ? getSpeakerName(sm.speakerId) : '+ Assign'}</span>
                  {sm && <EditIcon />}
                </button>
              )}
              {serviceSettings.communion.enabled && (
                <button className={'calendar-bar ' + (c ? '' : 'bar-empty')} style={c ? {background: '#fce7f3', color: '#be185d'} : {}} onClick={() => c ? setEditingNote({ slotKey: k + '-communion', ...c }) : isAdmin && setAssigningSlot({ slotKey: k + '-communion', date: k, serviceType: 'communion' })}>
                  <span>{getTimeLabel('communion')}{c ? getSpeakerName(c.speakerId) : '+ Assign'}</span>
                  {c && <EditIcon />}
                </button>
              )}
              {serviceSettings.sundayEvening.enabled && (
                <button className={'calendar-bar ' + (se ? '' : 'bar-empty')} style={se ? {background: '#ede9fe', color: '#5b21b6'} : {}} onClick={() => se ? setEditingNote({ slotKey: k + '-sundayEvening', ...se }) : isAdmin && setAssigningSlot({ slotKey: k + '-sundayEvening', date: k, serviceType: 'sundayEvening' })}>
                  <span>{getTimeLabel('sundayEvening')}{se ? getSpeakerName(se.speakerId) : '+ Assign'}</span>
                  {se && <EditIcon />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* WEDNESDAY COLUMN */}
      <div style={{ flex: '1 1 300px' }}>
        <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold', color: '#1e3a5f' }}>Wednesdays</div>
        {days.filter(d => d.isCurrentMonth && d.date.getDay() === 3).map(d => {
          const k = d.date.toISOString().split('T')[0], w = schedule[k + '-wednesdayEvening'];
          return (
            <div key={k} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e3a5f' }}>{d.date.getDate()}</div>
              <button className={'calendar-bar ' + (w ? '' : 'bar-empty')} style={w ? {background: '#d1fae5', color: '#065f46'} : {}} onClick={() => w ? setEditingNote({ slotKey: k + '-wednesdayEvening', ...w }) : isAdmin && setAssigningSlot({ slotKey: k + '-wednesdayEvening', date: k, serviceType: 'wednesdayEvening' })}>
                <span>{getTimeLabel('wednesdayEvening')}{w ? getSpeakerName(w.speakerId) : '+ Assign'}</span>
                {w && <EditIcon />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
