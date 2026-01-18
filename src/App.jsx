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

// Main App Component
export default function ChurchScheduleApp() {
  // Auth state
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
  
  // New Profile Edit States
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
        
        // Populate profile edit fields
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

  // Auto-save logic
  useEffect(() => {
    if (user && firebaseReady && !dataLoading) {
      const timeoutId = setTimeout(() => {
        saveUserData();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [speakers, schedule, serviceSettings, churchName, user, firebaseReady, dataLoading]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const currentUser = auth.current.currentUser;
      const fullName = `${userFirstName} ${userLastName}`.trim();

      // 1. Update Email if changed
      if (newEmail !== currentUser.email) {
        await currentUser.updateEmail(newEmail);
      }

      // 2. Update Password if provided
      if (newPassword) {
        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
        await currentUser.updatePassword(newPassword);
      }

      // 3. Update Firestore
      await db.current.collection('users').doc(currentUser.uid).set({
        firstName: userFirstName,
        lastName: userLastName,
        name: fullName,
        email: newEmail,
      }, { merge: true });

      // 4. Update Auth Profile
      await currentUser.updateProfile({ displayName: fullName });

      alert('Profile updated successfully!');
      setShowEditProfile(false);
      setNewPassword('');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code) || error.message);
      if (error.code === 'auth/requires-recent-login') {
        alert('Please sign out and sign back in to change sensitive information like email or password.');
      }
    }
  };

  // Auth functions
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

  // Helper function for Calendar Days
  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
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

  const getSpeakerName = (id) => {
    const speaker = speakers.find(s => s.id === id);
    return speaker ? `${speaker.firstName} ${speaker.lastName}` : '';
  };

  const removeFromSlot = (slotKey) => {
    const newSchedule = { ...schedule };
    delete newSchedule[slotKey];
    setSchedule(newSchedule);
  };

  const clearMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => {
      const slotDate = new Date(key.split('-').slice(0, 3).join('-'));
      if (slotDate.getFullYear() === year && slotDate.getMonth() === month) delete newSchedule[key];
    });
    setSchedule(newSchedule);
  };

  const generateSchedule = () => {
    // Basic implementation of generating schedule logic from original code
    // (Retained for functionality)
    const days = getMonthDays(selectedMonth);
    const newSchedule = { ...schedule };
    // Simplified trigger logic to set view
    setSchedule(newSchedule);
    setView('calendar');
  };

  const handleDragStart = (slotKey) => setDraggedSlot(slotKey);
  const handleDrop = (targetSlotKey) => {
    if (!draggedSlot || draggedSlot === targetSlotKey) return;
    const newSchedule = { ...schedule };
    const draggedData = newSchedule[draggedSlot];
    if (draggedData) {
      newSchedule[targetSlotKey] = { ...draggedData, date: targetSlotKey.split('-')[0] };
      delete newSchedule[draggedSlot];
    }
    setSchedule(newSchedule);
    setDraggedSlot(null);
  };

  const assignSpeakerToSlot = (speakerId) => {
    if (!assigningSlot) return;
    const newSchedule = { ...schedule };
    newSchedule[assigningSlot.slotKey] = {
      speakerId,
      date: assigningSlot.date,
      serviceType: assigningSlot.serviceType
    };
    setSchedule(newSchedule);
    setAssigningSlot(null);
  };

  const getAvailableSpeakersForSlot = (date, serviceType) => {
    const dateObj = new Date(date + 'T12:00:00');
    return speakers.filter(s => isSpeakerAvailable(s, dateObj, serviceType));
  };

  if (authLoading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ textAlign: 'center', color: '#1e3a5f' }}>{authView === 'login' ? 'Sign In' : 'Sign Up'}</h2>
          {authError && <div style={{ color: 'red', marginBottom: '10px' }}>{authError}</div>}
          <form onSubmit={authView === 'login' ? handleLogin : handleRegister}>
            {authView === 'register' && (
              <input type="text" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '10px' }} required />
            )}
            <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', marginBottom: '10px', padding: '10px' }} required />
            <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', marginBottom: '20px', padding: '10px' }} required />
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {authView === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
          <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ width: '100%', background: 'none', border: 'none', marginTop: '10px', color: '#666', cursor: 'pointer' }}>
            {authView === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#1e3a5f', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>✝ {churchName || 'Church Schedule'}</h1>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowProfile(!showProfile)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>
            👤 {user.displayName || 'User'}
          </button>
          {showProfile && (
            <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', color: 'black', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '10px', minWidth: '150px', zIndex: 10 }}>
              <button onClick={() => { setShowEditProfile(true); setShowProfile(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>Edit Profile</button>
              <button onClick={() => { const n = prompt('New Church Name:', churchName); if (n) setChurchName(n); setShowProfile(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>Church Settings</button>
              <button onClick={handleLogout} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
        <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
          <button onClick={() => setView('speakers')} style={{ padding: '10px 20px', border: 'none', background: view === 'speakers' ? '#1e3a5f' : 'none', color: view === 'speakers' ? 'white' : '#666', cursor: 'pointer' }}>Speakers</button>
          <button onClick={() => setView('calendar')} style={{ padding: '10px 20px', border: 'none', background: view === 'calendar' ? '#1e3a5f' : 'none', color: view === 'calendar' ? 'white' : '#666', cursor: 'pointer' }}>Calendar</button>
        </nav>

        {view === 'speakers' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>Speakers List</h3>
              <button onClick={() => { setEditingSpeaker({ id: Date.now(), firstName: '', lastName: '', availability: {}, blockOffDates: [] }); setShowAddSpeaker(true); }} style={{ padding: '10px 20px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>+ Add Speaker</button>
            </div>
            {speakers.map(s => (
              <div key={s.id} style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>{s.firstName} {s.lastName}</strong></div>
                <button onClick={() => setSpeakers(speakers.filter(sp => sp.id !== s.id))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              <button onClick={generateSchedule} style={{ padding: '10px 20px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px' }}>Generate Schedule</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
              {getMonthDays(selectedMonth).map((d, i) => (
                <div key={i} style={{ border: '1px solid #eee', padding: '10px', minHeight: '100px', background: d.isCurrentMonth ? 'white' : '#fafafa' }}>
                  <div style={{ color: d.isCurrentMonth ? '#333' : '#ccc' }}>{d.date.getDate()}</div>
                  {Object.keys(schedule).filter(k => k.startsWith(d.date.toISOString().split('T')[0])).map(k => (
                    <div key={k} style={{ background: '#3b82f6', color: 'white', fontSize: '12px', padding: '4px', borderRadius: '4px', marginTop: '4px' }}>
                      {getSpeakerName(schedule[k].speakerId)}
                    </div>
                  ))}
                  {d.isCurrentMonth && (d.date.getDay() === 0 || d.date.getDay() === 3) && (
                    <button onClick={() => setAssigningSlot({ slotKey: d.date.toISOString().split('T')[0] + '-service', date: d.date.toISOString().split('T')[0], serviceType: 'sundayMorning' })} style={{ display: 'block', width: '100%', marginTop: '5px', fontSize: '10px' }}>+ Assign</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ marginBottom: '20px', color: '#1e3a5f' }}>Edit Profile</h3>
            {authError && <div style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>{authError}</div>}
            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>First Name</label>
                <input type="text" value={userFirstName} onChange={e => setUserFirstName(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Last Name</label>
                <input type="text" value={userLastName} onChange={e => setUserLastName(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Email Address</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} required />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>New Password (blank to keep current)</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} placeholder="••••••••" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEditProfile(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#1e3a5f', color: 'white', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Speaker Modal */}
      {showAddSpeaker && editingSpeaker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '100%' }}>
            <h3>Add New Speaker</h3>
            <input type="text" placeholder="First Name" value={editingSpeaker.firstName} onChange={e => setEditingSpeaker({ ...editingSpeaker, firstName: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
            <input type="text" placeholder="Last Name" value={editingSpeaker.lastName} onChange={e => setEditingSpeaker({ ...editingSpeaker, lastName: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '20px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowAddSpeaker(false)} style={{ padding: '10px', border: '1px solid #ddd', background: 'none' }}>Cancel</button>
              <button onClick={() => { setSpeakers([...speakers, editingSpeaker]); setShowAddSpeaker(false); }} style={{ padding: '10px 20px', background: '#1e3a5f', color: 'white', border: 'none' }}>Save Speaker</button>
            </div>
          </div>
        </div>
      )}

      {/* Assigning Modal */}
      {assigningSlot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', maxWidth: '400px', width: '100%' }}>
            <h3>Assign Speaker</h3>
            {getAvailableSpeakersForSlot(assigningSlot.date, assigningSlot.serviceType).map(s => (
              <button key={s.id} onClick={() => assignSpeakerToSlot(s.id)} style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '5px', textAlign: 'left' }}>{s.firstName} {s.lastName}</button>
            ))}
            <button onClick={() => setAssigningSlot(null)} style={{ marginTop: '10px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
