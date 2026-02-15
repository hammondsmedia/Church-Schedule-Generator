import React, { useState, useEffect, useRef } from 'react';
import logoIcon from './assets/logo-icon.svg';

// Modular Logic & Services
import { FIREBASE_CONFIG, loadFirebaseScripts } from './services/firebase';
import { generateScheduleLogic, getMonthDays } from './utils/scheduleLogic';
import { sendInviteEmail } from './services/email';
import { exportToCSV, importFromCSV, exportToPDF } from './utils/exportUtils';

// Tab Components
import DirectoryTab from './components/tabs/DirectoryTab';
import CalendarTab from './components/tabs/CalendarTab';
import ServicesTab from './components/tabs/ServicesTab';

// NEW: Page Component
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
  const [churchNameLocked, setChurchNameLocked] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [members, setMembers] = useState([]); 
  const [families, setFamilies] = useState([]); 
  const [pendingInvites, setPendingInvites] = useState([]); 
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('directory');
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' or 'account'
  
  const [showSettings, setShowSettings] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [assigningSlot, setAssigningSlot] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showActions, setShowActions] = useState(false); 

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
        storage.current = window.firebase.storage();

        auth.current.onAuthStateChanged((u) => {
          setUser(u); setAuthLoading(false);
          if (u) loadUserData(u.uid);
        });
        setFirebaseReady(true);
      } catch (err) { setAuthLoading(false); }
    };
    init();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowActions(false);
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
          fetchOrgData(userData.orgId);
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
    } catch (err) { console.error('Error loading data', err); }
    setDataLoading(false);
  };

  const fetchOrgData = async (targetOrgId) => {
    const inviteSnapshot = await db.current.collection('invitations').where('orgId', '==', targetOrgId).where('status', '==', 'pending').get();
    const activeInvites = inviteSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(invite => invite.expiresAt > new Date().toISOString());
    setPendingInvites(activeInvites);
  };

  useEffect(() => {
    if (user && firebaseReady && !dataLoading && orgId && ['owner', 'admin'].includes(userRole)) {
      const t = setTimeout(() => {
        db.current.collection('organizations').doc(orgId).set({ 
          members, families, schedule, serviceSettings, churchName, updatedAt: new Date().toISOString() 
        }, { merge: true });
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [members, families, schedule, serviceSettings, churchName]);

  const handleUpdateSelf = async (updatedData) => {
    try {
      await db.current.collection('users').doc(user.uid).update(updatedData);
      const updatedMembers = members.map(m => m.id === user.uid ? { ...m, ...updatedData } : m);
      setMembers(updatedMembers);
    } catch (err) { alert("Failed to update directory entry."); }
  };

  const handleLogout = () => auth.current.signOut().then(() => window.location.reload());
  const getSpeakerName = (id) => { const s = members.find(m => m.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Outfit' }}>Loading...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {/* Auth UI omitted for length - remains as previously defined */}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Outfit', sans-serif !important; }
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #1e3a5f; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; }
        .nav-tab { padding: 12px 20px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .avatar-header { width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
      `}</style>

      <header style={{ background: '#f3f4f6', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setCurrentPage('dashboard')}>
            <img src={logoIcon} alt="Logo" style={{ height: '35px' }} />
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e3a5f' }}>Collab App</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {['owner', 'admin'].includes(userRole) && <button className="btn-secondary" style={{padding: '8px 16px'}} onClick={() => setShowSettings(true)}>⚙️ Settings</button>}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button className="btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <img src={members.find(m => m.id === user.uid)?.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="avatar-header" alt="Me" />
                <span>Account ▼</span>
              </button>
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #eee', borderRadius: '12px', width: '180px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <button onClick={() => { setCurrentPage('account'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '12px 20px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>My Profile</button>
                  <button onClick={handleLogout} style={{ width: '100%', padding: '12px 20px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', borderTop: '1px solid #eee' }}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
        {currentPage === 'account' ? (
          <AccountPage 
            user={user} 
            memberData={members.find(m => m.id === user.uid) || {}} 
            onUpdate={handleUpdateSelf} 
            onBack={() => setCurrentPage('dashboard')} 
            storage={storage.current}
          />
        ) : (
          <>
            <h2 style={{ color: '#1e3a5f', marginBottom: '24px', fontWeight: '700', paddingLeft: '16px', borderLeft: '4px solid #FF8C37' }}>{churchName}</h2>
            <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #ddd', marginBottom: '24px' }}>
              <button className={'nav-tab ' + (view === 'directory' ? 'active' : '')} onClick={() => setView('directory')}>👥 Directory</button>
              <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>📅 Calendar</button>
              <button className={'nav-tab ' + (view === 'services' ? 'active' : '')} onClick={() => setView('services')}>🛠️ Services</button>
            </nav>

            {view === 'directory' ? (
              <DirectoryTab members={members} families={families} userRole={userRole} setEditingMember={setEditingMember} />
            ) : view === 'services' ? (
              <ServicesTab members={members} schedule={schedule} />
            ) : (
              <CalendarTab selectedMonth={selectedMonth} schedule={schedule} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />
            )}
          </>
        )}
      </main>

      <MemberProfileModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} editingMember={editingMember} setEditingMember={setEditingMember} members={members} setMembers={setMembers} families={families} setFamilies={setFamilies} serviceSettings={serviceSettings} userRole={userRole} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members} pendingInvites={pendingInvites} />
    </div>
  );
}
