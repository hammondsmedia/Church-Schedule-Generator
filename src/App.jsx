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
  const [churchNameLocked, setChurchNameLocked] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [members, setMembers] = useState([]); 
  const [families, setFamilies] = useState([]); 
  const [pendingInvites, setPendingInvites] = useState([]); 
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [invitationData, setInvitationData] = useState(null); 

  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('directory');
  const [currentPage, setCurrentPage] = useState('dashboard');
  
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

        const inviteCode = new URLSearchParams(window.location.search).get('invite');
        if (inviteCode) {
          const doc = await db.current.collection('invitations').doc(inviteCode).get();
          if (doc.exists) {
            const d = doc.data();
            setInvitationData(d);
            setChurchName(d.churchName);
            setChurchNameLocked(true);
            setAuthView('register');
          }
        }

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

  // --- HANDLERS ---
  const handleGenerateSchedule = () => {
    setSchedule(generateScheduleLogic(selectedMonth, members, serviceSettings, schedule));
    setView('calendar'); 
  };

  const handleUpdateSelf = async (updatedData) => {
    try {
      await db.current.collection('users').doc(user.uid).update(updatedData);
      setMembers(prev => prev.map(m => m.id === user.uid ? { ...m, ...updatedData } : m));
    } catch (err) { alert("Update failed."); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("CRITICAL: This will permanently delete your account and remove you from the directory. This cannot be undone. Proceed?")) return;
    
    try {
      // 1. Remove from organization members list
      const updatedMembers = members.filter(m => m.id !== user.uid);
      await db.current.collection('organizations').doc(orgId).update({ members: updatedMembers });
      
      // 2. Delete user document
      await db.current.collection('users').doc(user.uid).delete();
      
      // 3. Delete Auth record
      await auth.current.currentUser.delete();
      
      window.location.reload();
    } catch (err) {
      alert("For security, please sign out and sign back in before deleting your account.");
    }
  };

  const handleLogin = (e) => { 
    e.preventDefault(); 
    setAuthError('');
    auth.current.signInWithEmailAndPassword(authEmail, authPassword)
      .catch(err => setAuthError(err.message)); 
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const r = await auth.current.createUserWithEmailAndPassword(authEmail, authPassword);
      await r.user.updateProfile({ displayName: authName });
      const targetOrgId = invitationData?.orgId || ('org_' + Math.random().toString(36).substring(2, 12));
      const firstName = authName.split(' ')[0] || '';
      const lastName = authName.split(' ').slice(1).join(' ') || '';
      
      const newMember = { id: r.user.uid, firstName, lastName, email: authEmail, isSpeaker: false, serviceSkills: [], leadershipRole: "", familyId: "", availability: {}, blockOffDates: [], repeatRules: [] };

      if (!invitationData) {
        await db.current.collection('organizations').doc(targetOrgId).set({ churchName, ownerUid: r.user.uid, members: [newMember], createdAt: new Date().toISOString() });
      } else {
        const orgRef = db.current.collection('organizations').doc(targetOrgId);
        await db.current.runTransaction(async (t) => {
          const doc = await t.get(orgRef);
          if (doc.exists) t.update(orgRef, { members: [...(doc.data().members || []), newMember] });
        });
      }
      await db.current.collection('users').doc(r.user.uid).set({ email: authEmail, name: authName, orgId: targetOrgId, role: invitationData?.role || 'owner', createdAt: new Date().toISOString() });
      window.location.reload();
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => auth.current.signOut().then(() => window.location.reload());
  const getSpeakerName = (id) => { const s = (members || []).find(m => m.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Outfit' }}>Loading...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`* { box-sizing: border-box; font-family: 'Outfit', sans-serif !important; } .auth-in { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 12px; }`}</style>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src={logoIcon} alt="Logo" style={{ height: '60px', marginBottom: '16px' }} />
        <h2 style={{ textAlign: 'center', color: '#1e3a5f', marginBottom: '24px' }}>Church Collab App</h2>
        <form onSubmit={authView === 'login' ? handleLogin : handleRegister} style={{ width: '100%' }}>
          {authView === 'register' && <input className="auth-in" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
          <input className="auth-in" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="auth-in" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button className="btn-primary" style={{width: '100%', padding: '12px', fontWeight: 'bold'}} type="submit">{authView === 'login' ? 'Login' : 'Sign Up'}</button>
          {authError && <p style={{color: 'red', fontSize: '11px', marginTop: '10px'}}>{authError}</p>}
        </form>
        <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ border: 'none', background: 'none', marginTop: '12px', color: '#1e3a5f', cursor: 'pointer' }}>
          {authView === 'login' ? "Need an account? Sign Up" : "Back to Login"}
        </button>
      </div>
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
        .avatar-header { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
      `}</style>

      <header style={{ background: '#f3f4f6', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setCurrentPage('dashboard')}>
            <img src={logoIcon} alt="Logo" style={{ height: '35px' }} />
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e3a5f' }}>Collab App</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {['owner', 'admin'].includes(userRole) && <button className="btn-secondary" style={{padding: '8px 16px'}} onClick={() => setShowSettings(true)}>⚙️ Settings</button>}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button className="btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <img src={(members || []).find(m => m.id === user.uid)?.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="avatar-header" alt="Me" />
                <span>My Account ▼</span>
              </button>
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #eee', borderRadius: '12px', width: '180px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <button onClick={() => { setCurrentPage('account'); setShowProfileMenu(false); }} style={{ width: '100%', padding: '12px 20px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>My Profile</button>
                  <button onClick={handleLogout} style={{ width: '100%', padding: '12px 20px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', borderTop: '1px solid #eee' }}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
        {currentPage === 'account' ? (
          <AccountPage user={user} memberData={(members || []).find(m => m.id === user.uid) || {}} onUpdate={handleUpdateSelf} onDelete={handleDeleteAccount} onBack={() => setCurrentPage('dashboard')} storage={storage.current} />
        ) : (
          <>
            <h2 style={{ color: '#1e3a5f', marginBottom: '20px', fontWeight: '700', borderLeft: '4px solid #FF8C37', paddingLeft: '16px' }}>{churchName}</h2>
            <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #ddd', marginBottom: '24px', overflowX: 'auto' }}>
              <button className={'nav-tab ' + (view === 'directory' ? 'active' : '')} onClick={() => setView('directory')}>👥 Directory</button>
              <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>📅 Calendar</button>
              <button className={'nav-tab ' + (view === 'services' ? 'active' : '')} onClick={() => setView('services')}>🛠️ Services</button>
            </nav>

            {view === 'directory' ? (
              <DirectoryTab members={members || []} families={families || []} userRole={userRole} setEditingMember={setEditingMember} />
            ) : view === 'services' ? (
              <ServicesTab members={members || []} schedule={schedule || {}} />
            ) : (
              <CalendarTab selectedMonth={selectedMonth} schedule={schedule || {}} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />
            )}
          </>
        )}
      </main>

      <MemberProfileModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} editingMember={editingMember} setEditingMember={setEditingMember} members={members || []} setMembers={setMembers} families={families || []} setFamilies={setFamilies} serviceSettings={serviceSettings} userRole={userRole} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members || []} pendingInvites={pendingInvites} />
    </div>
  );
}
