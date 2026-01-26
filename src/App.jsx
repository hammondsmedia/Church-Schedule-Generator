import React, { useState, useEffect, useRef } from 'react';
import logoIcon from './assets/logo-icon.svg';

// Modular Logic & Services
import { FIREBASE_CONFIG, loadFirebaseScripts } from './services/firebase';
import { generateScheduleLogic } from './utils/scheduleLogic';

// Tab Components
import SpeakersTab from './components/tabs/SpeakersTab';
import CalendarTab from './components/tabs/CalendarTab';
import ServicesTab from './components/tabs/ServicesTab';

// Modal Components
import SettingsModal from './components/modals/SettingsModal';
import SpeakerModal from './components/modals/SpeakerModal';
import ProfileModal from './components/modals/ProfileModal';
import NoteModal from './components/modals/NoteModal';

export default function ChurchScheduleApp() {
  // --- GLOBAL STATE ---
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [churchNameLocked, setChurchNameLocked] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [speakers, setSpeakers] = useState([]);
  const [servicePeople, setServicePeople] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('speakers');
  
  // Modal States
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [assigningSlot, setAssigningSlot] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);

  const [serviceSettings, setServiceSettings] = useState({
    sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
    sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
    wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:30 PM' },
    communion: { enabled: true, label: 'Communion', time: '' }
  });

  const db = useRef(null);
  const auth = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        await loadFirebaseScripts();
        if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
        auth.current = window.firebase.auth();
        db.current = window.firebase.firestore();

        // Check for invitation link
        const inviteCode = new URLSearchParams(window.location.search).get('invite');
        if (inviteCode) {
          const doc = await db.current.collection('invitations').doc(inviteCode).get();
          if (doc.exists) { setChurchName(doc.data().churchName); setChurchNameLocked(true); setAuthView('register'); }
        }

        auth.current.onAuthStateChanged((u) => {
          setUser(u); setAuthLoading(false);
          if (u) loadUserData(u.uid);
        });
        setFirebaseReady(true);
      } catch (err) { setAuthLoading(false); }
    };
    init();
  }, []);

  // --- DATA SYNC ---
  const loadUserData = async (uid) => {
    setDataLoading(true);
    const userDoc = await db.current.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      setOrgId(userData.orgId); setUserRole(userData.role);
      setUserFirstName(userData.firstName || ''); setUserLastName(userData.lastName || '');
      setNewEmail(auth.current.currentUser?.email || '');
      if (userData.orgId) {
        const orgDoc = await db.current.collection('organizations').doc(userData.orgId).get();
        if (orgDoc.exists) {
          const d = orgDoc.data();
          setSpeakers(d.speakers || []); setSchedule(d.schedule || {});
          setServiceSettings(d.serviceSettings || serviceSettings);
          setServicePeople(d.servicePeople || []); setChurchName(d.churchName || '');
        }
        const snapshot = await db.current.collection('users').where('orgId', '==', userData.orgId).get();
        setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    }
    setDataLoading(false);
  };

  useEffect(() => {
    if (user && firebaseReady && !dataLoading && orgId && ['owner', 'admin'].includes(userRole)) {
      const t = setTimeout(() => {
        db.current.collection('organizations').doc(orgId).set({ 
          speakers, servicePeople, schedule, serviceSettings, churchName, updatedAt: new Date().toISOString() 
        }, { merge: true });
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [speakers, servicePeople, schedule, serviceSettings, churchName]);

  // --- AUTH HANDLERS ---
  const handleLogin = (e) => { e.preventDefault(); auth.current.signInWithEmailAndPassword(authEmail, authPassword).catch(err => setAuthError(err.message)); };
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const r = await auth.current.createUserWithEmailAndPassword(authEmail, authPassword);
      const finalOrgId = orgId || ('org_' + r.user.uid);
      if (!orgId) await db.current.collection('organizations').doc(finalOrgId).set({ churchName, ownerUid: r.user.uid, createdAt: new Date().toISOString() });
      await db.current.collection('users').doc(r.user.uid).set({ email: authEmail, name: authName, orgId: finalOrgId, role: 'owner' });
    } catch (err) { setAuthError(err.message); }
  };
  const handleLogout = () => auth.current.signOut().then(() => window.location.reload());

  // --- SHARED UTILS ---
  const getSpeakerName = (id) => { const s = speakers.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Loading...</div>;

  // --- LOGIN VIEW ---
  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src={logoIcon} alt="Logo" style={{ height: '80px', marginBottom: '16px' }} />
        <h2 style={{ textAlign: 'center', color: '#1e3a5f', marginBottom: '24px' }}>Church of Christ Collab App</h2>
        <form onSubmit={authView === 'login' ? handleLogin : handleRegister} style={{ width: '100%' }}>
          {authView === 'register' && <input className="input-field" style={{marginBottom: 12}} placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
          {authView === 'register' && <input className="input-field" style={{marginBottom: 12}} placeholder="Church Name" value={churchName} onChange={e => setChurchName(e.target.value)} disabled={churchNameLocked} required />}
          <input className="input-field" style={{marginBottom: 12}} placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="input-field" style={{marginBottom: 12}} type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button className="btn-primary" style={{width: '100%'}} type="submit">{authView === 'login' ? 'Login' : 'Sign Up'}</button>
          {authError && <p style={{color: 'red', fontSize: '12px', marginTop: '10px'}}>{authError}</p>}
        </form>
        <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ border: 'none', background: 'none', marginTop: '12px', color: '#1e3a5f', cursor: 'pointer' }}>
          {authView === 'login' ? "Need an account? Sign Up" : "Back to Login"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: "'Outfit', sans-serif" }}>
      <header style={{ background: '#f3f4f6', padding: '24px 0', borderBottom: '1px solid #e5e7eb', color: '#1e3a5f' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src={logoIcon} alt="Logo Icon" style={{ height: '52px' }} />
            <div><h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '800' }}>Church of Christ Collab App</h1></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['owner', 'admin'].includes(userRole) && <button className="btn-secondary" onClick={() => setShowSettings(true)}>⚙️ Settings</button>}
            <button className="btn-secondary" onClick={() => setShowProfile(!showProfile)}>👤 {user.displayName || 'Account'}</button>
            {showProfile && (
              <div style={{ position: 'absolute', top: '75px', right: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '220px', zIndex: 100 }}>
                <button onClick={() => { setShowEditProfile(true); setShowProfile(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px', border: 'none', background: 'none', cursor: 'pointer' }}>Edit Profile</button>
                <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
        <h2 style={{ color: '#1e3a5f', marginBottom: '20px', fontWeight: '700', borderLeft: '4px solid #FF8C37', paddingLeft: '16px' }}>{churchName || 'Norman Church of Christ'}</h2>
        <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #ddd', overflowX: 'auto' }}>
          <button className={'nav-tab ' + (view === 'speakers' ? 'active' : '')} onClick={() => setView('speakers')}>👤 Speakers</button>
          <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>📅 Calendar</button>
          <button className={'nav-tab ' + (view === 'services' ? 'active' : '')} onClick={() => setView('services')}>🛠️ Services</button>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>← Prev</button>
            <h2 style={{ color: '#1e3a5f', margin: 0, fontSize: 'clamp(18px, 4vw, 24px)' }}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>Next →</button>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            {view === 'calendar' && ['owner', 'admin'].includes(userRole) && <button className="btn-secondary" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => setSchedule({})}>🗑️ Clear Month</button>}
            {['owner', 'admin'].includes(userRole) && <button className="btn-primary" onClick={() => setSchedule(generateScheduleLogic(selectedMonth, speakers, serviceSettings, schedule))}>⚡ Generate Schedule</button>}
          </div>
        </div>

        {view === 'speakers' ? (
          <SpeakersTab speakers={speakers} userRole={userRole} setEditingSpeaker={setEditingSpeaker} setShowAddSpeaker={setShowAddSpeaker} setSpeakers={setSpeakers} />
        ) : view === 'services' ? (
          <ServicesTab servicePeople={servicePeople} setServicePeople={setServicePeople} speakers={speakers} />
        ) : (
          <CalendarTab selectedMonth={selectedMonth} schedule={schedule} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />
        )}
      </main>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members} inviteEmail={inviteEmail} setInviteEmail={setInviteEmail} inviteRole={inviteRole} setInviteRole={setInviteRole} setTransferTarget={setTransferTarget} />
      <SpeakerModal isOpen={showAddSpeaker} onClose={() => setShowAddSpeaker(false)} editingSpeaker={editingSpeaker} setEditingSpeaker={setEditingSpeaker} speakers={speakers} setSpeakers={setSpeakers} />
      <ProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} userRole={userRole} churchName={churchName} setChurchName={setChurchName} userFirstName={userFirstName} setUserFirstName={setUserFirstName} userLastName={userLastName} setUserLastName={setUserLastName} newEmail={newEmail} setNewEmail={setNewEmail} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} handleUpdateProfile={handleUpdateProfile} />
      <NoteModal isOpen={!!editingNote} onClose={() => setEditingNote(null)} editingNote={editingNote} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} handleSaveNote={handleSaveNote} userRole={userRole} setAssigningSlot={setAssigningSlot} />

      {assigningSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3>Assign Speaker</h3>
            {speakers.filter(s => s.availability?.[assigningSlot.serviceType]).map(s => (
              <button key={s.id} className="btn-secondary" style={{ width: '100%', marginBottom: '8px', textAlign: 'left' }} onClick={() => { setSchedule({ ...schedule, [assigningSlot.slotKey]: { speakerId: s.id, date: assigningSlot.date, serviceType: assigningSlot.serviceType } }); setAssigningSlot(null); }}>{s.firstName} {s.lastName}</button>
            ))}
            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setAssigningSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
