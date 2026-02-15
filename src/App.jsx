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
  const [churchName, setChurchName] = useState('');
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null);
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

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleLogin = (e) => { 
    e.preventDefault(); 
    auth.current.signInWithEmailAndPassword(authEmail, authPassword).catch(err => setAuthError(err.message)); 
  };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Outfit' }}>Connecting...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <img src={logoIcon} style={{ height: '60px', marginBottom: '16px' }} />
        <h2 style={{ color: '#1e3a5f', marginBottom: '24px', fontFamily: 'Outfit' }}>Church Collab App</h2>
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'grid', gap: '12px' }}>
          <input className="input-field" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="input-field" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button className="btn-primary" style={{ padding: '14px', fontWeight: '800' }} type="submit">Login</button>
        </form>
        {authError && <p style={{ color: 'red', fontSize: '12px', marginTop: '10px' }}>{authError}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Outfit', sans-serif !important; }
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .btn-primary:hover { background: #162a45; transform: translateY(-1px); }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #e5e7eb; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .btn-secondary:hover { border-color: #1e3a5f; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 24px; border: 1px solid #e5e7eb; }
        .nav-tab { padding: 16px 24px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; font-size: 15px; transition: all 0.3s; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .input-field { width: 100%; padding: 14px; border: 2px solid #e5e0d8; border-radius: 10px; font-size: 15px; outline: none; transition: border-color 0.2s; }
        .input-field:focus { border-color: #1e3a5f; }
        .avatar-circle { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .service-badge { padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; line-height: 1; }
      `}</style>

      <header style={{ background: '#ffffff', padding: '16px 0', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setCurrentPage('dashboard')}>
            <img src={logoIcon} alt="Logo" style={{ height: '35px' }} />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e3a5f', letterSpacing: '-0.5px' }}>Collab App</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {['owner', 'admin'].includes(userRole) && <button className="btn-secondary" style={{padding: '8px 16px', fontSize: '14px'}} onClick={() => setShowSettings(true)}>⚙️ Settings</button>}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button className="btn-secondary" style={{ padding: '4px 12px', border: '1px solid #eee' }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <img src={(members || []).find(m => m.id === user.uid)?.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=1e3a5f&color=fff`} className="avatar-circle" alt="Me" />
                <span style={{ fontWeight: '700' }}>Account ▼</span>
              </button>
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #eee', borderRadius: '12px', width: '200px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', overflow: 'hidden', padding: '8px' }}>
                  <button onClick={() => { setCurrentPage('account'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '8px' }}>My Profile</button>
                  <button onClick={() => auth.current.signOut()} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', borderTop: '1px solid #f3f4f6', borderRadius: '8px' }}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px' }}>
        {currentPage === 'account' ? (
          <AccountPage user={user} memberData={(members || []).find(m => m.id === user.uid) || {}} onUpdate={handleUpdateSelf} onBack={() => setCurrentPage('dashboard')} storage={storage.current} />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
              <div>
                <h2 style={{ color: '#1e3a5f', margin: 0, fontSize: '28px', fontWeight: '800' }}>{churchName || 'Your Congregation'}</h2>
                <p style={{ color: '#666', marginTop: '4px' }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>

            <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #e5e7eb', marginBottom: '32px' }}>
              <button className={'nav-tab ' + (view === 'directory' ? 'active' : '')} onClick={() => setView('directory')}>Congregation Directory</button>
              <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>Teaching Calendar</button>
              <button className={'nav-tab ' + (view === 'services' ? 'active' : '')} onClick={() => setView('services')}>Service Plans</button>
            </nav>

            <div className="fade-in">
              {view === 'directory' ? (
                <DirectoryTab members={members} families={families} userRole={userRole} setEditingMember={setEditingMember} />
              ) : view === 'services' ? (
                <ServicesTab members={members} schedule={schedule} />
              ) : (
                <CalendarTab selectedMonth={selectedMonth} schedule={schedule} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />
              )}
            </div>
          </>
        )}
      </main>

      <MemberProfileModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} editingMember={editingMember} setEditingMember={setEditingMember} members={members} setMembers={setMembers} families={families} setFamilies={setFamilies} serviceSettings={serviceSettings} userRole={userRole} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members} />
      
      <style>{`.fade-in { animation: fadeIn 0.4s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
