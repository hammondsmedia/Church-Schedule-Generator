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

// Firebase SDK URLs
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';

export default function ChurchScheduleApp() {
  // Auth and Profile state
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
  
  // Profile Edit States
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);

  const firebaseApp = useRef(null);
  const db = useRef(null);
  const auth = useRef(null);

  // App state
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

  // Load Firebase SDK
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        if (window.firebase) {
          initializeFirebase();
          return;
        }
        const loadScript = (url) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        };
        await loadScript(FIREBASE_APP_URL);
        await loadScript(FIREBASE_AUTH_URL);
        await loadScript(FIREBASE_FIRESTORE_URL);
        initializeFirebase();
      } catch (error) {
        console.error('Failed to load Firebase:', error);
        setAuthLoading(false);
      }
    };

    const initializeFirebase = () => {
      if (!window.firebase.apps.length) {
        firebaseApp.current = window.firebase.initializeApp(FIREBASE_CONFIG);
      } else {
        firebaseApp.current = window.firebase.apps[0];
      }
      auth.current = window.firebase.auth();
      db.current = window.firebase.firestore();
      auth.current.onAuthStateChanged((user) => {
        setUser(user);
        setAuthLoading(false);
        if (user) {
          loadUserData(user.uid);
        }
      });
      setFirebaseReady(true);
    };
    loadFirebase();
  }, []);

  // Load user data from Firestore
  const loadUserData = async (userId) => {
    if (!db.current) return;
    setDataLoading(true);
    try {
      const userDoc = await db.current.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data.speakers) setSpeakers(data.speakers);
        if (data.schedule) setSchedule(data.schedule);
        if (data.serviceSettings) setServiceSettings(data.serviceSettings);
        if (data.churchName) setChurchName(data.churchName);
        setUserFirstName(data.firstName || data.name?.split(' ')[0] || '');
        setUserLastName(data.lastName || data.name?.split(' ').slice(1).join(' ') || '');
        setNewEmail(auth.current.currentUser?.email || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    setDataLoading(false);
  };

  // Save user data to Firestore
  const saveUserData = async () => {
    if (!db.current || !user || dataLoading) return;
    try {
      await db.current.collection('users').doc(user.uid).set({
        speakers,
        schedule,
        serviceSettings,
        churchName,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  useEffect(() => {
    if (user && firebaseReady && !dataLoading) {
      const timeoutId = setTimeout(() => {
        saveUserData();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [speakers, schedule, serviceSettings, churchName, user, firebaseReady, dataLoading]);

  // Auth/Profile Handlers
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const currentUser = auth.current.currentUser;
      const fullName = `${userFirstName} ${userLastName}`.trim();
      if (newEmail !== currentUser.email) await currentUser.updateEmail(newEmail);
      if (newPassword) {
        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
        await currentUser.updatePassword(newPassword);
      }
      await db.current.collection('users').doc(currentUser.uid).set({
        firstName: userFirstName,
        lastName: userLastName,
        name: fullName,
        email: newEmail,
      }, { merge: true });
      await currentUser.updateProfile({ displayName: fullName });
      alert('Profile updated successfully!');
      setShowEditProfile(false);
      setNewPassword('');
    } catch (error) {
      setAuthError(error.message);
      if (error.code === 'auth/requires-recent-login') {
        alert('Please sign out and sign back in to change sensitive information.');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await auth.current.signInWithEmailAndPassword(authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    try {
      const result = await auth.current.createUserWithEmailAndPassword(authEmail, authPassword);
      await result.user.updateProfile({ displayName: authName });
      const [fName, ...lNameParts] = authName.split(' ');
      const lName = lNameParts.join(' ');
      const initialData = {
        email: authEmail,
        name: authName,
        firstName: fName || '',
        lastName: lName || '',
        churchName: churchName || 'My Church',
        speakers: [],
        schedule: {},
        serviceSettings: {
          sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
          sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
          wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:00 PM' },
          communion: { enabled: true, label: 'Communion', time: '' }
        },
        createdAt: new Date().toISOString()
      };
      await db.current.collection('users').doc(result.user.uid).set(initialData);
      setChurchName(initialData.churchName);
      setServiceSettings(initialData.serviceSettings);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    }
  };

  const handleLogout = async () => {
    try {
      await auth.current.signOut();
      setSpeakers([]);
      setSchedule({});
      setChurchName('');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getAuthErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered';
      case 'auth/invalid-email': return 'Invalid email address';
      case 'auth/weak-password': return 'Password is too weak';
      case 'auth/user-not-found': return 'No account found with this email';
      case 'auth/wrong-password': return 'Incorrect password';
      default: return 'An error occurred. Please try again.';
    }
  };

  // Schedule logic
  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    return days;
  };

  const isSpeakerAvailable = (speaker, date, serviceType) => {
    if (!speaker.availability[serviceType]) return false;
    const dateStr = date.toISOString().split('T')[0];
    for (const block of speaker.blockOffDates || []) {
      if (dateStr >= block.start && dateStr <= block.end) return false;
    }
    return true;
  };

  const shuffleArray = (array, seed) => {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    while (currentIndex > 0) {
      const randomIndex = Math.floor(seededRandom() * currentIndex);
      currentIndex--;
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    return shuffled;
  };

  const generateSchedule = () => {
    const days = getMonthDays(selectedMonth);
    const newSchedule = { ...schedule }; // Persistent month fix
    const seed = selectedMonth.getFullYear() * 12 + selectedMonth.getMonth();
    const speakerCounts = {};
    speakers.forEach(s => { speakerCounts[s.id] = { sundayMorning: 0, sundayEvening: 0, wednesdayEvening: 0, communion: 0, total: 0 }; });
    const slots = { sundayMorning: [], sundayEvening: [], wednesdayEvening: [], communion: [] };
    let sundayCount = 0;
    days.forEach(({ date, isCurrentMonth }) => {
      if (!isCurrentMonth) return;
      const dayOfWeek = date.getDay();
      const dateKey = date.toISOString().split('T')[0];
      if (dayOfWeek === 0) {
        sundayCount++;
        if (serviceSettings.sundayMorning.enabled) slots.sundayMorning.push({ dateKey, date, weekOfMonth: sundayCount });
        if (serviceSettings.sundayEvening.enabled) slots.sundayEvening.push({ dateKey, date, weekOfMonth: sundayCount });
        if (serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled) slots.communion.push({ dateKey, date, weekOfMonth: sundayCount });
      }
      if (dayOfWeek === 3 && serviceSettings.wednesdayEvening.enabled) slots.wednesdayEvening.push({ dateKey, date, weekOfMonth: Math.ceil(date.getDate() / 7) });
    });

    const getSortedAvailableSpeakers = (date, serviceType, excludeSpeakerId = null) => {
      let available = speakers.filter(s => isSpeakerAvailable(s, date, serviceType)).filter(s => excludeSpeakerId ? s.id !== excludeSpeakerId : true);
      const priority1 = available.filter(s => s.priority === 1);
      const priority2 = available.filter(s => s.priority === 2);
      const defaultPriority = available.filter(s => !s.priority || s.priority === 0);
      const serviceOffset = serviceType === 'sundayMorning' ? 0 : serviceType === 'sundayEvening' ? 1000 : serviceType === 'wednesdayEvening' ? 2000 : 3000;
      const shuffledDefault = shuffleArray(defaultPriority, seed + serviceOffset);
      const sortByCount = (a, b) => speakerCounts[a.id][serviceType] - speakerCounts[b.id][serviceType];
      priority1.sort(sortByCount); priority2.sort(sortByCount); shuffledDefault.sort(sortByCount);
      return [...priority1, ...priority2, ...shuffledDefault];
    };

    const fillSlots = (serviceType, slotList, excludeFromSlotKey = null) => {
      slotList.forEach(slot => {
        const slotKey = `${slot.dateKey}-${serviceType}`;
        if (newSchedule[slotKey]) return;
        let excludeSpeakerId = null;
        if (excludeFromSlotKey) excludeSpeakerId = newSchedule[`${slot.dateKey}-${excludeFromSlotKey}`]?.speakerId;
        const available = getSortedAvailableSpeakers(slot.date, serviceType, excludeSpeakerId);
        if (available.length > 0) {
          const selected = available[0];
          newSchedule[slotKey] = { speakerId: selected.id, date: slot.dateKey, serviceType };
          speakerCounts[selected.id][serviceType]++;
        }
      });
    };

    fillSlots('sundayMorning', slots.sundayMorning);
    fillSlots('communion', slots.communion, 'sundayMorning');
    fillSlots('sundayEvening', slots.sundayEvening);
    fillSlots('wednesdayEvening', slots.wednesdayEvening);
    setSchedule(newSchedule);
    setView('calendar');
  };

  const getSpeakerName = (id) => {
    const speaker = speakers.find(s => s.id === id);
    return speaker ? `${speaker.firstName} ${speaker.lastName}` : '';
  };

  const assignSpeakerToSlot = (speakerId) => {
    if (!assigningSlot) return;
    const newSchedule = { ...schedule };
    newSchedule[assigningSlot.slotKey] = { speakerId, date: assigningSlot.date, serviceType: assigningSlot.serviceType };
    setSchedule(newSchedule);
    setAssigningSlot(null);
  };

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <style>{`* { box-sizing: border-box; } .auth-input { width: 100%; padding: 14px 16px; border: 2px solid #e5e0d8; border-radius: 10px; margin-bottom: 16px; }`}</style>
      <div style={{ background: 'white', padding: '48px 40px', borderRadius: '24px', maxWidth: '440px', width: '100%' }}>
        <h1 style={{ textAlign: 'center', color: '#1e3a5f' }}>✝ Church Schedule</h1>
        <form onSubmit={authView === 'login' ? handleLogin : handleRegister}>
          {authView === 'register' && <input className="auth-input" placeholder="Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
          <input className="auth-input" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="auth-input" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button type="submit" style={{ width: '100%', padding: '14px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
            {authView === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ width: '100%', background: 'none', border: 'none', color: '#1e3a5f', marginTop: '20px', cursor: 'pointer' }}>
          {authView === 'login' ? "Need an account? Sign Up" : "Have an account? Sign In"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap');
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #1e3a5f; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; }
        .nav-tab { padding: 12px 24px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; transition: 0.2s; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .service-badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-right: 8px; display: inline-block; }
        .calendar-bar { padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: white; margin: 4px 0; cursor: pointer; display: block; width: 100%; text-align: left; border: none; }
        .input-field { width: 100%; padding: 12px 16px; border: 2px solid #e5e0d8; border-radius: 8px; font-family: 'Outfit', sans-serif; }
      `}</style>

      <header style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)', padding: '32px 0', color: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1 style={{ margin: 0 }}>✝ {churchName || 'Church Schedule'}</h1><p style={{ opacity: 0.8 }}>Manage speakers and schedules</p></div>
          <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
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

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px' }}>
        <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #ddd' }}>
          <button className={`nav-tab ${view === 'speakers' ? 'active' : ''}`} onClick={() => setView('speakers')}>👤 Speakers</button>
          <button className={`nav-tab ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>📅 Calendar</button>
        </nav>

        {view === 'speakers' && (
          <div style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#1e3a5f', margin: 0 }}>Manage Speakers ({speakers.length})</h2>
              <button className="btn-primary" onClick={() => { setEditingSpeaker({ id: Date.now(), firstName: '', lastName: '', availability: { sundayMorning: false, sundayEvening: false, wednesdayEvening: false, communion: false }, blockOffDates: [], priority: 0 }); setShowAddSpeaker(true); }}>+ Add Speaker</button>
            </div>
            {speakers.map(s => (
              <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e3a5f' }}>{s.firstName} {s.lastName}</h3>
                  {s.priority > 0 && <span className="service-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>★ Priority {s.priority}</span>}
                  {s.availability.sundayMorning && <span className="service-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Sunday Morning</span>}
                  {s.availability.wednesdayEvening && <span className="service-badge" style={{ background: '#d1fae5', color: '#065f46' }}>Wednesday Evening</span>}
                  {s.availability.communion && <span className="service-badge" style={{ background: '#fce7f3', color: '#be185d' }}>Communion</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={() => { setEditingSpeaker({...s}); setShowAddSpeaker(true); }}>Edit</button>
                  <button style={{ padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }} onClick={() => setSpeakers(speakers.filter(sp => sp.id !== s.id))}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'calendar' && (
          <div style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>← Prev</button>
                <h2 style={{ color: '#1e3a5f', margin: 0, minWidth: '200px', textAlign: 'center' }}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>Next →</button>
              </div>
              <button className="btn-primary" onClick={generateSchedule}>⚡ Generate Schedule</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex' }}>
              <div style={{ flex: 1, borderRight: '1px solid #eee' }}>
                <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', borderBottom: '1px solid #eee' }}><strong>Sundays</strong></div>
                {getMonthDays(selectedMonth).filter(d => d.isCurrentMonth && d.date.getDay() === 0).map(d => {
                  const dateKey = d.date.toISOString().split('T')[0];
                  const sm = schedule[`${dateKey}-sundayMorning`];
                  const com = schedule[`${dateKey}-communion`];
                  const se = schedule[`${dateKey}-sundayEvening`];
                  return (
                    <div key={dateKey} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>{d.date.getDate()}</div>
                      {serviceSettings.sundayMorning.enabled && (
                        <button className="calendar-bar" style={{ background: sm ? '#1e3a5f' : '#e5e7eb', color: sm ? 'white' : '#666' }} onClick={() => setAssigningSlot({ slotKey: `${dateKey}-sundayMorning`, date: dateKey, serviceType: 'sundayMorning', label: 'Sunday Morning' })}>
                          Sunday Morning: {sm ? getSpeakerName(sm.speakerId) : '+ Assign'}
                        </button>
                      )}
                      {serviceSettings.communion.enabled && (
                        <button className="calendar-bar" style={{ background: com ? '#1e3a5f' : '#e5e7eb', color: com ? 'white' : '#666' }} onClick={() => setAssigningSlot({ slotKey: `${dateKey}-communion`, date: dateKey, serviceType: 'communion', label: 'Communion' })}>
                          Communion: {com ? getSpeakerName(com.speakerId) : '+ Assign'}
                        </button>
                      )}
                      {serviceSettings.sundayEvening.enabled && (
                        <button className="calendar-bar" style={{ background: se ? '#1e3a5f' : '#e5e7eb', color: se ? 'white' : '#666' }} onClick={() => setAssigningSlot({ slotKey: `${dateKey}-sundayEvening`, date: dateKey, serviceType: 'sundayEvening', label: 'Sunday Evening' })}>
                          Sunday Evening: {se ? getSpeakerName(se.speakerId) : '+ Assign'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', borderBottom: '1px solid #eee' }}><strong>Wednesdays</strong></div>
                {getMonthDays(selectedMonth).filter(d => d.isCurrentMonth && d.date.getDay() === 3).map(d => {
                  const dateKey = d.date.toISOString().split('T')[0];
                  const we = schedule[`${dateKey}-wednesdayEvening`];
                  return (
                    <div key={dateKey} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>{d.date.getDate()}</div>
                      <button className="calendar-bar" style={{ background: we ? '#10b981' : '#e5e7eb', color: we ? 'white' : '#666' }} onClick={() => setAssigningSlot({ slotKey: `${dateKey}-wednesdayEvening`, date: dateKey, serviceType: 'wednesdayEvening', label: 'Wednesday' })}>
                        Wednesday: {we ? getSpeakerName(we.speakerId) : '+ Assign'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e3a5f' }}>Edit Profile</h3>
            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>First Name</label>
              <input className="input-field" value={userFirstName} onChange={e => setUserFirstName(e.target.value)} required /></div>
              <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Last Name</label>
              <input className="input-field" value={userLastName} onChange={e => setUserLastName(e.target.value)} required /></div>
              <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>Email Address</label>
              <input className="input-field" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></div>
              <div style={{ marginBottom: '24px' }}><label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>New Password (blank to keep current)</label>
              <input className="input-field" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditProfile(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddSpeaker && editingSpeaker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e3a5f' }}>{speakers.find(s => s.id === editingSpeaker.id) ? 'Edit' : 'Add'} Speaker</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input className="input-field" placeholder="First" value={editingSpeaker.firstName} onChange={e => setEditingSpeaker({...editingSpeaker, firstName: e.target.value})} />
              <input className="input-field" placeholder="Last" value={editingSpeaker.lastName} onChange={e => setEditingSpeaker({...editingSpeaker, lastName: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAddSpeaker(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                const idx = speakers.findIndex(s => s.id === editingSpeaker.id);
                if (idx >= 0) { const ns = [...speakers]; ns[idx] = editingSpeaker; setSpeakers(ns); }
                else { setSpeakers([...speakers, editingSpeaker]); }
                setShowAddSpeaker(false);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {assigningSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e3a5f' }}>Assign Speaker</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getAvailableSpeakersForSlot(assigningSlot.date, assigningSlot.serviceType).map(s => (
                <button key={s.id} className="btn-secondary" style={{ textAlign: 'left' }} onClick={() => assignSpeakerToSlot(s.id)}>{s.firstName} {s.lastName}</button>
              ))}
              <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={() => setAssigningSlot(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
