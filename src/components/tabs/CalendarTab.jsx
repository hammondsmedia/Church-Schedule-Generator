// src/components/tabs/CalendarTab.jsx
import React from 'react';
import { getMonthDays } from '../../utils/scheduleLogic';

export default function CalendarTab({ 
  selectedMonth, 
  schedule, 
  serviceSettings, 
  userRole, 
  setAssigningSlot, 
  setEditingNote, 
  getSpeakerName 
}) {
  const days = getMonthDays(selectedMonth);

  // Helper to get time label
  const getTimeLabel = (type) => {
    const setting = serviceSettings[type];
    return setting && setting.enabled && setting.time ? `${setting.time} — ` : '';
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
      {/* SUNDAY COLUMN */}
      <div style={{ flex: '1 1 300px', borderRight: '1px solid #eee' }}>
        <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold', color: '#1e3a5f' }}>
          Sundays
        </div>
        {days.filter(d => d.isCurrentMonth && d.date.getDay() === 0).map(d => {
          const k = d.date.toISOString().split('T')[0];
          const sm = schedule[k + '-sundayMorning'];
          const c = schedule[k + '-communion'];
          const se = schedule[k + '-sundayEvening'];

          return (
            <div key={k} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e3a5f' }}>{d.date.getDate()}</div>
              
              {/* Sunday Morning Slot */}
              {serviceSettings.sundayMorning.enabled && (
                <button 
                  className={'calendar-bar ' + (sm ? '' : 'bar-empty')} 
                  style={sm ? {background: '#dbeafe', color: '#1e40af'} : {}} 
                  onClick={() => sm ? setEditingNote({ slotKey: k + '-sundayMorning', ...sm }) : ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-sundayMorning', date: k, serviceType: 'sundayMorning' })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{getTimeLabel('sundayMorning')}{sm ? getSpeakerName(sm.speakerId) : '+ Assign'}</span>
                    {sm && <span style={{ opacity: 0.5 }}>✏️</span>}
                  </div>
                  {sm?.note && <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, fontStyle: 'italic', marginTop: '2px' }}>Topic: {sm.note}</span>}
                </button>
              )}

              {/* Communion Slot */}
              {serviceSettings.communion.enabled && (
                <button 
                  className={'calendar-bar ' + (c ? '' : 'bar-empty')} 
                  style={c ? {background: '#fce7f3', color: '#be185d'} : {}} 
                  onClick={() => c ? setEditingNote({ slotKey: k + '-communion', ...c }) : ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-communion', date: k, serviceType: 'communion' })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{getTimeLabel('communion')}{c ? getSpeakerName(c.speakerId) : '+ Assign'}</span>
                    {c && <span style={{ opacity: 0.5 }}>✏️</span>}
                  </div>
                  {c?.note && <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, fontStyle: 'italic', marginTop: '2px' }}>Note: {c.note}</span>}
                </button>
              )}

              {/* Sunday Evening Slot */}
              {serviceSettings.sundayEvening.enabled && (
                <button 
                  className={'calendar-bar ' + (se ? '' : 'bar-empty')} 
                  style={se ? {background: '#ede9fe', color: '#5b21b6'} : {}} 
                  onClick={() => se ? setEditingNote({ slotKey: k + '-sundayEvening', ...se }) : ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-sundayEvening', date: k, serviceType: 'sundayEvening' })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{getTimeLabel('sundayEvening')}{se ? getSpeakerName(se.speakerId) : '+ Assign'}</span>
                    {se && <span style={{ opacity: 0.5 }}>✏️</span>}
                  </div>
                  {se?.note && <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, fontStyle: 'italic', marginTop: '2px' }}>Topic: {se.note}</span>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* WEDNESDAY COLUMN */}
      <div style={{ flex: '1 1 300px' }}>
        <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold', color: '#1e3a5f' }}>
          Wednesdays
        </div>
        {days.filter(d => d.isCurrentMonth && d.date.getDay() === 3).map(d => {
          const k = d.date.toISOString().split('T')[0];
          const w = schedule[k + '-wednesdayEvening'];

          return (
            <div key={k} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e3a5f' }}>{d.date.getDate()}</div>
              <button 
                className={'calendar-bar ' + (w ? '' : 'bar-empty')} 
                style={w ? {background: '#d1fae5', color: '#065f46'} : {}} 
                onClick={() => w ? setEditingNote({ slotKey: k + '-wednesdayEvening', ...w }) : ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-wednesdayEvening', date: k, serviceType: 'wednesdayEvening' })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{getTimeLabel('wednesdayEvening')}{w ? getSpeakerName(w.speakerId) : '+ Assign'}</span>
                  {w && <span style={{ opacity: 0.5 }}>✏️</span>}
                </div>
                {w?.note && <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, fontStyle: 'italic', marginTop: '2px' }}>Topic: {w.note}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
