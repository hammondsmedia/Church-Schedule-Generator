import React, { useState, useEffect, useRef } from 'react';

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1uwoEbX9BSnmbXPBQFOdzJGSdvxv22MM",
  authDomain: "teaching-schedule-generator.firebaseapp.com",
  projectId: "teaching-schedule-generator",
  storageBucket: "teaching-schedule-generator.firebasestorage.app",
  messagingSenderId: "154699704030",
  appId: "1:154699704030:web:eba731b832f79a8170444f"
};

const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';

export default function ChurchScheduleApp() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState('login'); 
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);

  const firebaseApp = useRef(null);
  const db = useRef(null);
  const auth = useRef(null);

  const [speakers, setSpeakers] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('speakers');
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [draggedSlot, setDraggedSlot] = useState(null);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [assigningSlot, setAssigningSlot] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [serviceSettings, setServiceSettings] = useState({
    sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
    sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
    wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:00 PM' },
    communion: { enabled: true, label: 'Communion', time: '' }
  });

  useEffect(() => {
    const loadFirebase = async () => {
      try {
        if (window.firebase) {
          initializeFirebase();
          return;
        }
        const loadScript = (url) => new Promise((res, rej) => {
          const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = rej; document.head.appendChild(s);
        });
        await loadScript(FIREBASE_APP_URL);
        await loadScript(FIREBASE_AUTH_URL);
        await loadScript(FIREBASE_FIRESTORE_URL);
        initializeFirebase();
      } catch (err) { console.error('Firebase load failed', err); setAuthLoading(false); }
    };
    const initializeFirebase = () => {
      if (!window.firebase.apps.length) firebaseApp.current = window.firebase.initializeApp(FIREBASE_CONFIG);
      else firebaseApp.current = window.firebase.apps[0];
      auth.current = window.firebase.auth();
      db.current = window.firebase.firestore();
      auth.current.onAuthStateChanged((u) => {
        setUser(u); setAuthLoading(false);
        if (u) loadUserData(u.uid);
      });
      setFirebaseReady(true);
    };
    loadFirebase();
  }, []);

  const loadUserData = async (uid) => {
    if (!db.current) return;
    setDataLoading(true);
    try {
      const doc = await db.current.collection('users').doc(uid).get();
      if (doc.exists) {
        const data = doc.data();
        if (data.speakers) setSpeakers(data.speakers);
        if (data.schedule) setSchedule(data.schedule);
        if (data.serviceSettings) setServiceSettings(data.serviceSettings);
        if (data.churchName) setChurchName(data.churchName);
        setUserFirstName(data.firstName || data.name?.split(' ')[0] || '');
        setUserLastName(data.lastName || data.name?.split(' ').slice(1).join(' ') || '');
        setNewEmail(auth.current.currentUser?.email || '');
      }
    } catch (err) { console.error('Error loading data', err); }
    setDataLoading(false);
  };

  const saveUserData = async () => {
    if (!db.current || !user || dataLoading) return;
    try {
      await db.current.collection('users').doc(user.uid).set({
        speakers, schedule, serviceSettings, churchName, updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) { console.error('Save failed', err); }
  };

  useEffect(() => {
    if (user && firebaseReady && !dataLoading) {
      const t = setTimeout(() => saveUserData(), 1000);
      return () => clearTimeout(t);
    }
  }, [speakers, schedule, serviceSettings, churchName, user, firebaseReady, dataLoading]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault(); setAuthError('');
    try {
      const u = auth.current.currentUser;
      const full = `${userFirstName} ${userLastName}`.trim();
      if (newEmail !== u.email) await u.updateEmail(newEmail);
      if (newPassword) await u.updatePassword(newPassword);
      await db.current.collection('users').doc(u.uid).set({ firstName: userFirstName, lastName: userLastName, name: full, email: newEmail }, { merge: true });
      await u.updateProfile({ displayName: full });
      alert('Profile updated!'); setShowEditProfile(false); setNewPassword('');
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError('');
    try { await auth.current.signInWithEmailAndPassword(authEmail, authPassword); setAuthEmail(''); setAuthPassword(''); }
    catch (err) { setAuthError(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthError('');
    try {
      const r = await auth.current.createUserWithEmailAndPassword(authEmail, authPassword);
      await r.user.updateProfile({ displayName: authName });
      const f = authName.split(' ')[0], l = authName.split(' ').slice(1).join(' ');
      await db.current.collection('users').doc(r.user.uid).set({ email: authEmail, name: authName, firstName: f, lastName: l, churchName: churchName || 'My Church', speakers: [], schedule: {}, serviceSettings, createdAt: new Date().toISOString() });
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = async () => { await auth.current.signOut(); setSpeakers([]); setSchedule({}); };

  const getMonthDays = (date) => {
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const d = [];
    for (let i = first.getDay() - 1; i >= 0; i--) d.push({ date: new Date(y, m, -i), isCurrentMonth: false });
    for (let i = 1; i <= last.getDate(); i++) d.push({ date: new Date(y, m, i), isCurrentMonth: true });
    while (d.length < 42) d.push({ date: new Date(y, m + 1, d.length - last.getDate() - (first.getDay() - 1)), isCurrentMonth: false });
    return d;
  };

  const isSpeakerAvailable = (s, d, type) => {
    if (!s.availability[type]) return false;
    const ds = d.toISOString().split('T')[0];
    for (const b of (s.blockOffDates || [])) if (ds >= b.start && ds <= b.end) return false;
    return true;
  };

  const generateSchedule = () => {
    const days = getMonthDays(selectedMonth), newSchedule = { ...schedule };
    const seed = selectedMonth.getFullYear() * 12 + selectedMonth.getMonth();
    const counts = {}; speakers.forEach(s => counts[s.id] = { sundayMorning: 0, sundayEvening: 0, wednesdayEvening: 0, communion: 0 });
    const slots = { sundayMorning: [], sundayEvening: [], wednesdayEvening: [], communion: [] };
    let sc = 0;
    days.forEach(({ date, isCurrentMonth }) => {
      if (!isCurrentMonth) return;
      const dw = date.getDay(), dk = date.toISOString().split('T')[0];
      if (dw === 0) {
        sc++;
        if (serviceSettings.sundayMorning.enabled) slots.sundayMorning.push({ dk, date, week: sc });
        if (serviceSettings.sundayEvening.enabled) slots.sundayEvening.push({ dk, date, week: sc });
        if (serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled) slots.communion.push({ dk, date, week: sc });
      }
      if (dw === 3 && serviceSettings.wednesdayEvening.enabled) slots.wednesdayEvening.push({ dk, date, week: Math.ceil(date.getDate() / 7) });
    });

    const getAvailable = (d, type, exId = null) => {
      let av = speakers.filter(s => isSpeakerAvailable(s, d, type) && s.id !== exId);
      const p1 = av.filter(s => s.priority === 1), p2 = av.filter(s => s.priority === 2), def = av.filter(s => !s.priority);
      const off = type === 'sundayMorning' ? 0 : type === 'sundayEvening' ? 1000 : type === 'wednesdayEvening' ? 2000 : 3000;
      const shuf = (arr) => {
        let a = [...arr], cur = a.length, s = seed + off;
        while (cur > 0) { let r = Math.floor(((s = (s * 9301 + 49297) % 233280) / 233280) * cur); cur--; [a[cur], a[r]] = [a[r], a[cur]]; }
        return a;
      };
      const sort = (a, b) => counts[a.id][type] - counts[b.id][type];
      return [...p1.sort(sort), ...p2.sort(sort), ...shuf(def).sort(sort)];
    };

    const applyRepeat = (type, list) => {
      speakers.forEach(s => {
        (s.repeatRules || []).filter(r => r.serviceType === type).forEach(r => {
          list.forEach(sl => {
            const sk = `${sl.dk}-${type}`;
            if (!newSchedule[sk] && isSpeakerAvailable(s, sl.date, type)) {
              if ((r.pattern === 'everyOther' && ((r.startWeek === 'odd') ? (sl.week % 2 !== 0) : (sl.week % 2 === 0))) || (r.pattern === 'nthWeek' && sl.week === r.nthWeek)) {
                newSchedule[sk] = { speakerId: s.id, date: sl.dk, serviceType: type }; counts[s.id][type]++;
              }
            }
          });
        });
      });
    };

    ['sundayMorning', 'sundayEvening', 'wednesdayEvening'].forEach(t => applyRepeat(t, slots[t]));
    const fill = (t, list, ex) => list.forEach(sl => {
      const sk = `${sl.dk}-${t}`;
      if (!newSchedule[sk]) {
        const sel = getAvailable(sl.date, t, ex ? newSchedule[`${sl.dk}-${ex}`]?.speakerId : null)[0];
        if (sel) { newSchedule[sk] = { speakerId: sel.id, date: sl.dk, serviceType: t }; counts[sel.id][t]++; }
      }
    });
    fill('sundayMorning', slots.sundayMorning); fill('communion', slots.communion, 'sundayMorning'); fill('sundayEvening', slots.sundayEvening); fill('wednesdayEvening', slots.wednesdayEvening);
    setSchedule(newSchedule); setView('calendar');
  };

  // RESTORED: Clear Month Function
  const clearMonth = () => {
    const year = selectedMonth.getFullYear(), month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => {
      const slotDate = new Date(key.split('-').slice(0, 3).join('-'));
      if (slotDate.getFullYear() === year && slotDate.getMonth() === month) delete newSchedule[key];
    });
    setSchedule(newSchedule);
  };

  // RESTORED: Export to PDF Function
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const days = getMonthDays(selectedMonth);
    const sundays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 0);
    const wednesdays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 3);
    
    let sundaysHTML = '';
    sundays.forEach(({ date }) => {
      const dk = date.toISOString().split('T')[0], sm = schedule[`${dk}-sundayMorning`], c = schedule[`${dk}-communion`], se = schedule[`${dk}-sundayEvening`];
      let sv = '';
      if (serviceSettings.sundayMorning.enabled) sv += `<div style="background:#dbeafe;color:#1e40af;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;"><strong>${serviceSettings.sundayMorning.time}:</strong> ${sm ? speakers.find(s => s.id === sm.speakerId)?.firstName + ' ' + speakers.find(s => s.id === sm.speakerId)?.lastName : '—'}</div>`;
      if (serviceSettings.communion.enabled) sv += `<div style="background:#fce7f3;color:#be185d;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;"><strong>Communion:</strong> ${c ? speakers.find(s => s.id === c.speakerId)?.firstName + ' ' + speakers.find(s => s.id === c.speakerId)?.lastName : '—'}</div>`;
      if (serviceSettings.sundayEvening.enabled) sv += `<div style="background:#ede9fe;color:#5b21b6;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;"><strong>${serviceSettings.sundayEvening.time}:</strong> ${se ? speakers.find(s => s.id === se.speakerId)?.firstName + ' ' + speakers.find(s => s.id === se.speakerId)?.lastName : '—'}</div>`;
      sundaysHTML += `<div style="padding:12px;border-bottom:1px solid #ddd;"><div style="font-weight:bold;">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>${sv}</div>`;
    });

    let wedsHTML = '';
    wednesdays.forEach(({ date }) => {
      const dk = date.toISOString().split('T')[0], w = schedule[`${dk}-wednesdayEvening`];
      wedsHTML += `<div style="padding:12px;border-bottom:1px solid #ddd;"><div style="font-weight:bold;">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div><div style="background:#d1fae5;color:#065f46;padding:6px 10px;border-radius:4px;font-size:13px;"><strong>${serviceSettings.wednesdayEvening.time}:</strong> ${w ? speakers.find(s => s.id === w.speakerId)?.firstName + ' ' + speakers.find(s => s.id === w.speakerId)?.lastName : '—'}</div></div>`;
    });

    printWindow.document.write(`<html><head><title>Schedule - ${monthName}</title><style>body { font-family: sans-serif; padding: 20px; } h1, h2 { text-align: center; color: #1e3a5f; } .container { display: flex; gap: 24px; } .column { flex: 1; } .column-header { background: #1e3a5f; color: white; padding: 12px; text-align: center; font-weight: bold; }</style></head><body><h1>Teaching Schedule</h1><h2>${monthName}</h2><div class="container"><div class="column"><div class="column-header">Sundays</div>${sundaysHTML}</div><div class="column"><div class="column-header">Wednesdays</div>${wedsHTML}</div></div><script>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  const handleDragStart = (sk) => setDraggedSlot(sk);
  const handleDrop = (tk) => {
    if (!draggedSlot || draggedSlot === tk) return;
    const ns = { ...schedule }, d = ns[draggedSlot], t = ns[tk];
    if (d) ns[tk] = { ...d, date: tk.split('-')[0], serviceType: tk.split('-').slice(1).join('-') };
    if (t) ns[draggedSlot] = { ...t, date: draggedSlot.split('-')[0], serviceType: draggedSlot.split('-').slice(1).join('-') };
    else delete ns[draggedSlot];
    setSchedule(ns); setDraggedSlot(null);
  };

  const assignSpeakerToSlot = (sid) => {
    if (!assigningSlot) return;
    setSchedule({ ...schedule, [assigningSlot.slotKey]: { speakerId: sid, date: assigningSlot.date, serviceType: assigningSlot.serviceType } });
    setAssigningSlot(null);
  };

  const getAvailableSpeakersForSlot = (d, t) => speakers.filter(s => isSpeakerAvailable(s, new Date(d + 'T12:00:00'), t));

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Loading...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`* { box-sizing: border-box; } .auth-in { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 12px; }`}</style>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', color: '#1e3a5f' }}>✝ Church Schedule</h2>
        <form onSubmit={authView === 'login' ? handleLogin : handleRegister}>
          {authView === 'register' && <input className="auth-in" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
          <input className="auth-in" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="auth-in" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{authView === 'login' ? 'Login' : 'Sign Up'}</button>
        </form>
        <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ width: '100%', border: 'none', background: 'none', marginTop: '12px', cursor: 'pointer', color: '#1e3a5f' }}>{authView === 'login' ? 'Create Account' : 'Back to Login'}</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap');
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; flex-shrink: 0; }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #1e3a5f; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; overflow-x: hidden; }
        .nav-tab { padding: 12px 20px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .service-badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 0 8px 4px 0; display: inline-block; }
        .badge-priority { background: #fee2e2; color: #dc2626; }
        .badge-morning { background: #dbeafe; color: #1e40af; }
        .badge-evening { background: #ede9fe; color: #5b21b6; }
        .badge-wednesday { background: #d1fae5; color: #065f46; }
        .badge-communion { background: #fce7f3; color: #be185d; }
        .calendar-bar { padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; margin: 4px 0; cursor: grab; display: block; width: 100%; text-align: left; border: none; }
        .bar-empty { background: #e5e7eb; color: #666; cursor: pointer; }
        .input-field { width: 100%; padding: 12px; border: 2px solid #e5e0d8; border-radius: 8px; font-family: 'Outfit', sans-serif; }
      `}</style>

      <header style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)', padding: '32px 0', color: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 36px)' }}>✝ {churchName || 'Church Schedule'}</h1>
            <p style={{ opacity: 0.8, fontSize: '14px', marginTop: '4px' }}>Manage speakers and generated schedules</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'transparent' }} onClick={() => setShowSettings(true)}>⚙️ Settings</button>
            <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'transparent' }} onClick={() => setShowProfile(!showProfile)}>👤 {user.displayName}</button>
            {showProfile && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '220px', overflow: 'hidden', color: '#333', zIndex: 100 }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}><strong>{user.displayName}</strong></div>
                <button onClick={() => { setShowEditProfile(true); setShowProfile(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px', border: 'none', background: 'none', cursor: 'pointer' }}>Edit Profile</button>
                <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }}>
        <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #ddd', overflowX: 'auto' }}>
          <button className={`nav-tab ${view === 'speakers' ? 'active' : ''}`} onClick={() => setView('speakers')}>👤 Speakers</button>
          <button className={`nav-tab ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>📅 Calendar</button>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-start' }}>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>← Prev</button>
            <h2 style={{ color: '#1e3a5f', margin: 0, minWidth: '150px', textAlign: 'center', fontSize: 'clamp(18px, 4vw, 24px)' }}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>Next →</button>
          </div>
          
          {/* RESTORED: Clear and PDF Buttons in Responsive Header */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {view === 'calendar' && (
              <>
                <button className="btn-secondary" style={{ color: '#991b1b', borderColor: '#991b1b' }} onClick={clearMonth}>🗑️ Clear Month</button>
                <button className="btn-secondary" onClick={exportToPDF}>📄 Export PDF</button>
              </>
            )}
            <button className="btn-primary" onClick={generateSchedule}>⚡ Generate Schedule</button>
          </div>
        </div>

        {view === 'speakers' ? (
          <div>
            {speakers.map(s => (
              <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#1e3a5f' }}>{s.firstName} {s.lastName}</h3>
                  {s.priority > 0 && <span className="service-badge badge-priority">★ Priority {s.priority}</span>}
                  {s.availability.sundayMorning && <span className="service-badge badge-morning">Sunday Morning</span>}
                  {s.availability.sundayEvening && <span className="service-badge badge-evening">Sunday Evening</span>}
                  {s.availability.wednesdayEvening && <span className="service-badge badge-wednesday">Wednesday Evening</span>}
                  {s.availability.communion && <span className="service-badge badge-communion">Communion</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => { setEditingSpeaker({...s}); setShowAddSpeaker(true); }}>Edit</button>
                  <button style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setSpeakers(speakers.filter(sp => sp.id !== s.id))}>Remove</button>
                </div>
              </div>
            ))}
            <button className="btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => { setEditingSpeaker({ id: Date.now(), firstName: '', lastName: '', availability: {}, blockOffDates: [], repeatRules: [] }); setShowAddSpeaker(true); }}>+ Add Speaker</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', borderRight: '1px solid #eee' }}>
              <div style={{ padding: '12px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold' }}>Sundays</div>
              {getMonthDays(selectedMonth).filter(d => d.isCurrentMonth && d.date.getDay() === 0).map(d => {
                const k = d.date.toISOString().split('T')[0];
                const sm = schedule[`${k}-sundayMorning`], c = schedule[`${k}-communion`], se = schedule[`${k}-sundayEvening`];
                return (
                  <div key={k} style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{d.date.getDate()}</div>
                    {serviceSettings.sundayMorning.enabled && <button draggable={!!sm} onDragStart={() => handleDragStart(`${k}-sundayMorning`)} onDrop={() => handleDrop(`${k}-sundayMorning`)} onDragOver={e => e.preventDefault()} className={`calendar-bar ${sm ? 'badge-morning' : 'bar-empty'}`} onClick={() => setAssigningSlot({ slotKey: `${k}-sundayMorning`, date: k, serviceType: 'sundayMorning' })}>{serviceSettings.sundayMorning.time}: {sm ? speakers.find(s => s.id === sm.speakerId)?.firstName + ' ' + speakers.find(s => s.id === sm.speakerId)?.lastName : '+ Assign'}</button>}
                    {serviceSettings.communion.enabled && <button draggable={!!c} onDragStart={() => handleDragStart(`${k}-communion`)} onDrop={() => handleDrop(`${k}-communion`)} onDragOver={e => e.preventDefault()} className={`calendar-bar ${c ? 'badge-communion' : 'bar-empty'}`} onClick={() => setAssigningSlot({ slotKey: `${k}-communion`, date: k, serviceType: 'communion' })}>Communion: {c ? speakers.find(s => s.id === c.speakerId)?.firstName + ' ' + speakers.find(s => s.id === c.speakerId)?.lastName : '+ Assign'}</button>}
                    {serviceSettings.sundayEvening.enabled && <button draggable={!!se} onDragStart={() => handleDragStart(`${k}-sundayEvening`)} onDrop={() => handleDrop(`${k}-sundayEvening`)} onDragOver={e => e.preventDefault()} className={`calendar-bar ${se ? 'badge-evening' : 'bar-empty'}`} onClick={() => setAssigningSlot({ slotKey: `${k}-sundayEvening`, date: k, serviceType: 'sundayEvening' })}>{serviceSettings.sundayEvening.time}: {se ? speakers.find(s => s.id === se.speakerId)?.firstName + ' ' + speakers.find(s => s.id === se.speakerId)?.lastName : '+ Assign'}</button>}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ padding: '12px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold' }}>Wednesdays</div>
              {getMonthDays(selectedMonth).filter(d => d.isCurrentMonth && d.date.getDay() === 3).map(d => {
                const k = d.date.toISOString().split('T')[0], w = schedule[`${k}-wednesdayEvening`];
                return (
                  <div key={k} style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{d.date.getDate()}</div>
                    <button draggable={!!w} onDragStart={() => handleDragStart(`${k}-wednesdayEvening`)} onDrop={() => handleDrop(`${k}-wednesdayEvening`)} onDragOver={e => e.preventDefault()} className={`calendar-bar ${w ? 'badge-wednesday' : 'bar-empty'}`} onClick={() => setAssigningSlot({ slotKey: `${k}-wednesdayEvening`, date: k, serviceType: 'wednesdayEvening' })}>{serviceSettings.wednesdayEvening.time}: {w ? speakers.find(s => s.id === w.speakerId)?.firstName + ' ' + speakers.find(s => s.id === w.speakerId)?.lastName : '+ Assign'}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: PROFILE */}
      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Edit Profile</h3>
            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '12px' }}><label>First Name</label><input className="input-field" value={userFirstName} onChange={e => setUserFirstName(e.target.value)} required /></div>
              <div style={{ marginBottom: '12px' }}><label>Last Name</label><input className="input-field" value={userLastName} onChange={e => setUserLastName(e.target.value)} required /></div>
              <div style={{ marginBottom: '12px' }}><label>Email</label><input className="input-field" value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></div>
              <div style={{ marginBottom: '24px' }}><label>New Password</label><input className="input-field" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditProfile(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SETTINGS */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>⚙️ Settings</h3>
            {Object.keys(serviceSettings).map(k => (
              <div key={k} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', gap: '10px', fontWeight: 'bold', marginBottom: '8px' }}>
                  <input type="checkbox" checked={serviceSettings[k].enabled} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], enabled: e.target.checked } })} /> {serviceSettings[k].label}
                </label>
                {serviceSettings[k].enabled && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input-field" value={serviceSettings[k].label} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], label: e.target.value } })} />
                    {k !== 'communion' && <input className="input-field" value={serviceSettings[k].time} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], time: e.target.value } })} />}
                  </div>
                )}
              </div>
            ))}
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowSettings(false)}>Close</button>
          </div>
        </div>
      )}

      {/* MODAL: SPEAKER */}
      {showAddSpeaker && editingSpeaker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{speakers.find(s => s.id === editingSpeaker.id) ? 'Edit' : 'Add'} Speaker</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input className="input-field" placeholder="First" value={editingSpeaker.firstName} onChange={e => setEditingSpeaker({ ...editingSpeaker, firstName: e.target.value })} />
              <input className="input-field" placeholder="Last" value={editingSpeaker.lastName} onChange={e => setEditingSpeaker({ ...editingSpeaker, lastName: e.target.value })} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label>Priority</label>
              <select className="input-field" value={editingSpeaker.priority || 0} onChange={e => setEditingSpeaker({ ...editingSpeaker, priority: parseInt(e.target.value) })}>
                <option value={0}>None</option><option value={1}>Priority 1</option><option value={2}>Priority 2</option>
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Availability</strong><br />
              <label><input type="checkbox" checked={editingSpeaker.availability.sundayMorning} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, sundayMorning: e.target.checked } })} /> Sun Morning</label><br />
              <label><input type="checkbox" checked={editingSpeaker.availability.sundayEvening} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, sundayEvening: e.target.checked } })} /> Sun Evening</label><br />
              <label><input type="checkbox" checked={editingSpeaker.availability.wednesdayEvening} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, wednesdayEvening: e.target.checked } })} /> Wednesday</label><br />
              <label><input type="checkbox" checked={editingSpeaker.availability.communion} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, communion: e.target.checked } })} /> Communion</label>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Repeat Rules</strong>
              {(editingSpeaker.repeatRules || []).map((r, i) => (
                <div key={i} style={{ background: '#f8f6f3', padding: '10px', borderRadius: '8px', marginTop: '8px' }}>
                  <select className="input-field" value={r.serviceType} onChange={e => { const nr = [...editingSpeaker.repeatRules]; nr[i].serviceType = e.target.value; setEditingSpeaker({ ...editingSpeaker, repeatRules: nr }); }}>
                    <option value="">Select Service...</option><option value="sundayMorning">Sun AM</option><option value="sundayEvening">Sun PM</option><option value="wednesdayEvening">Wed</option>
                  </select>
                  <select className="input-field" style={{ marginTop: '4px' }} value={r.pattern} onChange={e => { const nr = [...editingSpeaker.repeatRules]; nr[i].pattern = e.target.value; setEditingSpeaker({ ...editingSpeaker, repeatRules: nr }); }}>
                    <option value="everyOther">Every Other Week</option><option value="nthWeek">Specific Week</option>
                  </select>
                  {r.pattern === 'everyOther' ? 
                    <select className="input-field" style={{ marginTop: '4px' }} value={r.startWeek} onChange={e => { const nr = [...editingSpeaker.repeatRules]; nr[i].startWeek = e.target.value; setEditingSpeaker({ ...editingSpeaker, repeatRules: nr }); }}><option value="odd">1st, 3rd, 5th</option><option value="even">2nd, 4th</option></select> :
                    <select className="input-field" style={{ marginTop: '4px' }} value={r.nthWeek} onChange={e => { const nr = [...editingSpeaker.repeatRules]; nr[i].nthWeek = parseInt(e.target.value); setEditingSpeaker({ ...editingSpeaker, repeatRules: nr }); }}><option value={1}>1st Week</option><option value={2}>2nd Week</option><option value={3}>3rd Week</option><option value={4}>4th Week</option></select>
                  }
                  <button onClick={() => setEditingSpeaker({ ...editingSpeaker, repeatRules: editingSpeaker.repeatRules.filter((_, idx) => idx !== i) })} style={{ width: '100%', marginTop: '4px', color: 'red' }}>Remove Rule</button>
                </div>
              ))}
              <button className="btn-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => setEditingSpeaker({ ...editingSpeaker, repeatRules: [...(editingSpeaker.repeatRules || []), { serviceType: '', pattern: 'everyOther', startWeek: 'odd', nthWeek: 1 }] })}>+ Add Rule</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAddSpeaker(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => { if (speakers.find(s => s.id === editingSpeaker.id)) setSpeakers(speakers.map(s => s.id === editingSpeaker.id ? editingSpeaker : s)); else setSpeakers([...speakers, editingSpeaker]); setShowAddSpeaker(false); }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {assigningSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3>Assign Speaker</h3>
            {getAvailableSpeakersForSlot(assigningSlot.date, assigningSlot.serviceType).map(s => (
              <button key={s.id} className="btn-secondary" style={{ width: '100%', marginBottom: '8px' }} onClick={() => assignSpeakerToSlot(s.id)}>{s.firstName} {s.lastName}</button>
            ))}
            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setAssigningSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
