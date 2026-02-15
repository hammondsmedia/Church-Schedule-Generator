import React, { useState, useEffect, useRef } from 'react';
import logoIcon from './assets/logo-icon.svg';

// Modular Logic & Services
import { FIREBASE_CONFIG, loadFirebaseScripts } from './services/firebase';
import { generateScheduleLogic, getMonthDays } from './utils/scheduleLogic';
import { sendInviteEmail } from './services/email';
import { exportToCSV, importFromCSV, exportToPDF } from './utils/exportUtils';

// Tab & Page Components
import DirectoryTab from './components/tabs/DirectoryTab';
import CalendarTab from './components/tabs/CalendarTab';
import ServicesTab from './components/tabs/ServicesTab';
import AccountPage from './components/pages/AccountPage';

// Modal Components
import SettingsModal from './components/modals/SettingsModal';
import MemberProfileModal from './components/modals/MemberProfileModal';
import NoteModal from './components/modals/NoteModal';

export default function ChurchScheduleApp() {
  // --- STATE ---
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [churchName, setChurchName] = useState('');
  const [members, setMembers] = useState([]); 
  const [families, setFamilies] = useState([]); 
  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('directory');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [dataLoading, setDataLoading] = useState(false);

  // --- UI TOGGLES ---
  const [showSettings, setShowSettings] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [assigningSlot, setAssigningSlot] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [serviceSettings, setServiceSettings] = useState({
    sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
    sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
    wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:30 PM' },
    communion: { enabled: true, label: 'Communion', time: '' }
  });

  const db = useRef(null);
  const auth = useRef(null);
  const storage = useRef(null);
  const dropdownRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        await loadFirebaseScripts();
        if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
        auth.current = window.firebase.auth();
        db.current = window.firebase.firestore();
        if (typeof window.firebase.storage === 'function') storage.current = window.firebase.storage();

        auth.current.onAuthStateChanged((u) => {
          setUser(u);
          setAuthLoading(false);
          if (u) loadUserData(u.uid);
        });
        setFirebaseReady(true);
      } catch (err) {
        setAuthError("Database connection failed. Please refresh.");
        setAuthLoading(false);
      }
    };
    init();
  }, []);

  const loadUserData = async (uid) => {
    setDataLoading(true);
    try {
      const userDoc = await db.current.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        setOrgId(userData.orgId);
        setUserRole(userData.role);
        if (userData.orgId) {
          const orgDoc = await db.current.collection('organizations').doc(userData.orgId).get();
          if (orgDoc.exists) {
            const d = orgDoc.data();
            setMembers(d.members || []);
            setFamilies(d.families || []);
            setSchedule(d.schedule || {});
            setServiceSettings(d.serviceSettings || serviceSettings);
            setChurchName(d.churchName || '');
          }
        }
      }
    } catch (err) { console.error('Load Error:', err); }
    setDataLoading(false);
  };

  const handleUpdateSelf = async (updatedData) => {
    try {
      const updatedMembers = members.map(m => m.id === user.uid ? { ...m, ...updatedData } : m);
      await db.current.collection('users').doc(user.uid).update(updatedData);
      await db.current.collection('organizations').doc(orgId).update({ members: updatedMembers });
      setMembers(updatedMembers);
      alert("Profile updated!");
    } catch (err) { alert("Save failed."); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Permanently delete account?")) return;
    try {
      const updatedMembers = (members || []).filter(m => m.id !== user.uid);
      await db.current.collection('organizations').doc(orgId).update({ members: updatedMembers });
      await db.current.collection('users').doc(user.uid).delete();
      await auth.current.currentUser.delete();
      window.location.reload();
    } catch (err) { alert("Please re-login before deleting."); }
  };

  const handleLogin = (e) => { 
    e.preventDefault(); 
    auth.current.signInWithEmailAndPassword(authEmail, authPassword).catch(err => setAuthError(err.message)); 
  };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Outfit' }}>Connecting...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <img src={logoIcon} style={{ height: '60px', marginBottom: '16px' }} />
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'grid', gap: '12px' }}>
          <input className="input-field" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="input-field" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button className="btn-primary" type="submit">Login</button>
        </form>
        {authError && <p style={{ color: 'red', fontSize: '12px', marginTop: '10px' }}>{authError}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3' }}>
      <header style={{ background: '#f3f4f6', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 onClick={() => setCurrentPage('dashboard')} style={{ cursor: 'pointer', fontSize: '18px', color: '#1e3a5f' }}>Collab App</h1>
          <button className="btn-secondary" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            Account ▼
            {showProfileMenu && (
              <div style={{ position: 'absolute', top: '50px', right: '20px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', zIndex: 100 }}>
                <button onClick={() => { setCurrentPage('account'); setShowProfileMenu(false); }} style={{ display: 'block', width: '100%', padding: '10px' }}>Profile</button>
                <button onClick={() => auth.current.signOut()} style={{ display: 'block', width: '100%', padding: '10px', color: 'red' }}>Sign Out</button>
              </div>
            )}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
        {currentPage === 'account' ? (
          <AccountPage 
            user={user} 
            memberData={(members || []).find(m => m.id === user.uid) || {}} 
            onUpdate={handleUpdateSelf} 
            onDelete={handleDeleteAccount} 
            onBack={() => setCurrentPage('dashboard')} 
            storage={storage.current} 
          />
        ) : (
          <div>
             <nav style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setView('directory')}>Directory</button>
                <button onClick={() => setView('calendar')}>Calendar</button>
             </nav>
             {view === 'directory' ? <DirectoryTab members={members} families={families} userRole={userRole} setEditingMember={setEditingMember} /> : <CalendarTab schedule={schedule} members={members} />}
          </div>
        )}
      </main>
      <MemberProfileModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} editingMember={editingMember} setEditingMember={setEditingMember} members={members} families={families} serviceSettings={serviceSettings} userRole={userRole} />
    </div>
  );
}
