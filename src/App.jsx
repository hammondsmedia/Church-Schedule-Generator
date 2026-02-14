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

// Modal Components
import SettingsModal from './components/modals/SettingsModal';
import MemberProfileModal from './components/modals/MemberProfileModal';
import ProfileModal from './components/modals/ProfileModal';
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
  const [authMode, setAuthMode] = useState('create');
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

  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('directory');
  
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [assigningSlot, setAssigningSlot] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [showActions, setShowActions] = useState(false); 

  const [serviceSettings, setServiceSettings] = useState({
    sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
    sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
    wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:30 PM' },
    communion: { enabled: true, label: 'Communion', time: '' }
  });

  const db = useRef(null);
  const auth = useRef(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        await loadFirebaseScripts();
        if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
        auth.current = window.firebase.auth();
        db.current = window.firebase.firestore();

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowActions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- DATA ACTIONS ---
  const loadUserData = async (uid) => {
    setDataLoading(true);
    try {
      const userDoc = await db.current.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        setOrgId(userData.orgId);
        setUserRole(userData.role);
        setUserFirstName(userData.firstName || '');
        setUserLastName(userData.lastName || '');
        setNewEmail(auth.current.currentUser?.email || '');
        if (userData.orgId) {
          fetchOrgData(userData.orgId);
          const orgDoc = await db.current.collection('organizations').doc(userData.orgId).get();
          if (orgDoc.exists) {
            const d = orgDoc.data();
            if (!d.members) setMembers(migrateToDirectory(d)); // Migration logic
            
            setFamilies(d.families || []); // Load household data
            setSchedule(d.schedule || {});
            setServiceSettings(d.serviceSettings || serviceSettings);
            setChurchName(d.churchName || '');
          }
        }
      }
    } catch (err) { console.error('Error loading data', err); }
    setDataLoading(false);
  };

  const migrateToDirectory = (d) => {
    const combined = [];
    const speakerMap = {};
    (d.speakers || []).forEach(s => {
      if (!s) return;
      const m = { ...s, isSpeaker: true, serviceSkills: [], leadershipRole: "", familyId: "" };
      delete m.priority; 
      combined.push(m);
      speakerMap[`${s.firstName || ''} ${s.lastName || ''}`.toLowerCase()] = s.id;
    });
    (d.servicePeople || []).forEach(p => {
      if (!p) return;
      const key = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      if (!speakerMap[key]) combined.push({ ...p, isSpeaker: false, serviceSkills: [], leadershipRole: "", familyId: "" });
    });
    return combined;
  };

  const fetchOrgData = async (targetOrgId) => {
    const memberSnapshot = await db.current.collection('users').where('orgId', '==', targetOrgId).get();
    const now = new Date().toISOString();
    const inviteSnapshot = await db.current.collection('invitations').where('orgId', '==', targetOrgId).where('status', '==', 'pending').get();
    const activeInvites = inviteSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(invite => invite.expiresAt > now);

    const orgDoc = await db.current.collection('organizations').doc(targetOrgId).get();
    const orgMembers = orgDoc.exists ? (orgDoc.data().members || []) : [];
    const orgMemberById = Object.fromEntries(orgMembers.map(m => [String(m.id), m]));

    const mappedDirectoryMembers = memberSnapshot.docs.map(doc => {
      const userData = doc.data();
      const directoryData = orgMemberById[String(doc.id)] || {};
      const [firstFromName = '', ...restName] = (userData.name || '').split(' ');
      return {
        id: doc.id,
        firstName: directoryData.firstName || userData.firstName || firstFromName,
        lastName: directoryData.lastName || userData.lastName || restName.join(' '),
        email: userData.email || directoryData.email || '',
        phone: directoryData.phone || '',
        role: userData.role || 'viewer',
        isSpeaker: directoryData.isSpeaker || false,
        availability: directoryData.availability || {},
        blockOffDates: directoryData.blockOffDates || [],
        repeatRules: directoryData.repeatRules || [],
        serviceSkills: directoryData.serviceSkills || [],
        leadershipRole: directoryData.leadershipRole || '',
        familyId: directoryData.familyId || ''
      };
    });

    setMembers(mappedDirectoryMembers);
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

  const handleClearMonth = () => {
    if (!window.confirm("Clear assignments for this month?")) return;
    const year = selectedMonth.getFullYear(), month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => {
      const parts = key.split('-');
      if (parts.length >= 3 && parseInt(parts[0]) === year && parseInt(parts[1]) - 1 === month) delete newSchedule[key];
    });
    setSchedule(newSchedule);
    setShowActions(false);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const updatedSchedule = await importFromCSV(file, members, schedule);
      setSchedule(updatedSchedule);
      setShowActions(false);
    }
  };

  // RESTORED FIX: handleSaveNote defined within component scope
  const handleSaveNote = (slotKey, noteText) => {
    setSchedule(prev => ({ 
      ...prev, 
      [slotKey]: { ...prev[slotKey], note: noteText } 
    }));
    setEditingNote(null);
  };

  const generateInviteLink = async () => {
    if (!orgId || !inviteEmail) return alert("Enter email.");
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await db.current.collection('invitations').doc(inviteCode).set({ orgId, email: inviteEmail, role: inviteRole, churchName, status: 'pending', createdAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() });
      const link = `${window.location.origin}?invite=${inviteCode}`;
      await sendInviteEmail({ to_email: inviteEmail, church_name: churchName, invite_link: link, role: inviteRole });
      setInviteEmail(''); fetchOrgData(orgId);
    } catch (err) { alert(err.message); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const u = auth.current.currentUser;
    const full = (userFirstName + ' ' + userLastName).trim();
    if (newPassword) await u.updatePassword(newPassword);
    if (newEmail !== u.email) await u.updateEmail(newEmail);
    await db.current.collection('users').doc(u.uid).set({ firstName: userFirstName, lastName: userLastName, name: full, email: newEmail }, { merge: true });
    if (userRole === 'owner') await db.current.collection('organizations').doc(orgId).set({ churchName }, { merge: true });
    await u.updateProfile({ displayName: full });
    setShowEditProfile(false);
  };

  const handleLogin = (e) => { e.preventDefault(); auth.current.signInWithEmailAndPassword(authEmail, authPassword).catch(err => setAuthError(err.message)); };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      if (invitationData && invitationData.expiresAt < now) return setAuthError("Invitation expired.");

      const creatingOrg = authMode === 'create' && !invitationData;
      let targetOrgId = invitationData?.orgId || null;
      let targetRole = invitationData?.role || 'standard';

      if (!invitationData && !creatingOrg) {
        const orgQuery = await db.current.collection('organizations').where('churchName', '==', churchName.trim()).limit(1).get();
        if (orgQuery.empty) {
          setAuthError('Organization not found. Ask your owner/admin for the exact organization name or an invite link.');
          return;
        }
        targetOrgId = orgQuery.docs[0].id;
      }

      if (!targetOrgId) {
        targetOrgId = 'org_' + Math.random().toString(36).substring(2, 12);
        targetRole = 'owner';
      }

      const r = await auth.current.createUserWithEmailAndPassword(authEmail, authPassword);
      await r.user.updateProfile({ displayName: authName });

      if (!invitationData && creatingOrg) {
        await db.current.collection('organizations').doc(targetOrgId).set({ churchName, ownerUid: r.user.uid, createdAt: new Date().toISOString() });
      } else if (invitationData) {
        await db.current.collection('invitations').doc(new URLSearchParams(window.location.search).get('invite')).update({ status: 'accepted' });
      }

      const [firstName = '', ...lastParts] = authName.trim().split(' ');
      const lastName = lastParts.join(' ');

      await db.current.collection('users').doc(r.user.uid).set({
        email: authEmail,
        name: authName,
        firstName,
        lastName,
        orgId: targetOrgId,
        role: targetRole,
        createdAt: new Date().toISOString()
      });

      const orgDoc = await db.current.collection('organizations').doc(targetOrgId).get();
      const orgMembers = orgDoc.exists ? (orgDoc.data().members || []) : [];
      const withoutCurrent = orgMembers.filter(m => String(m.id) !== String(r.user.uid));
      withoutCurrent.push({
        id: r.user.uid,
        firstName,
        lastName,
        email: authEmail,
        phone: '',
        isSpeaker: false,
        availability: {},
        blockOffDates: [],
        repeatRules: [],
        serviceSkills: [],
        leadershipRole: '',
        familyId: ''
      });
      await db.current.collection('organizations').doc(targetOrgId).set({ members: withoutCurrent }, { merge: true });

      window.location.href = window.location.origin;
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => auth.current.signOut().then(() => window.location.reload());
  const getSpeakerName = (id) => { const s = members.find(m => m.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Outfit' }}>Loading...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`* { box-sizing: border-box; font-family: 'Outfit', sans-serif !important; } .auth-in { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 12px; }`}</style>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src={logoIcon} alt="Logo" style={{ height: '80px', marginBottom: '16px' }} />
        <h2 style={{ textAlign: 'center', color: '#1e3a5f', marginBottom: '24px', fontFamily: 'Outfit' }}>Church of Christ Collab App</h2>
        <form onSubmit={authView === 'login' ? handleLogin : handleRegister} style={{ width: '100%' }}>
          {authView === 'register' && <input className="auth-in" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
          {authView === 'register' && !invitationData && (
            <select className="auth-in" value={authMode} onChange={e => setAuthMode(e.target.value)}>
              <option value="create">Create New Organization</option>
              <option value="join">Join Existing Organization</option>
            </select>
          )}
          {authView === 'register' && <input className="auth-in" style={{backgroundColor: churchNameLocked ? '#f3f4f6' : 'white'}} placeholder="Church Name" value={churchName} onChange={e => setChurchName(e.target.value)} disabled={churchNameLocked} required />}
          <input className="auth-in" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="auth-in" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button className="btn-primary" style={{width: '100%', padding: '12px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'Outfit'}} type="submit">{authView === 'login' ? 'Login' : 'Sign Up'}</button>
        </form>
        <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ border: 'none', background: 'none', marginTop: '12px', color: '#1e3a5f', cursor: 'pointer', fontFamily: 'Outfit' }}>
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
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; flex-shrink: 0; }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #1e3a5f; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; overflow-x: hidden; }
        .nav-tab { padding: 12px 20px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; display: flex; align-items: center; gap: 8px; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .calendar-bar { padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; margin: 4px 0; cursor: pointer; display: block; width: 100%; text-align: left; border: none; }
        .bar-empty { background: #e5e7eb; color: #666; }
        .input-field { width: 100%; padding: 12px; border: 2px solid #e5e0d8; border-radius: 8px; }
        .service-badge { padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-right: 8px; margin-bottom: 8px; display: inline-flex; align-items: center; line-height: 1; white-space: nowrap; }
        .actions-dropdown { position: absolute; top: 100%; right: 0; margin-top: 8px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; min-width: 200px; z-index: 1000; display: flex; flex-direction: column !important; border: 1px solid #eee; padding: 8px 0; }
        .dropdown-item { padding: 12px 20px; text-align: left; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; color: #1e3a5f; display: flex; align-items: center; gap: 12px; width: 100%; }
        .dropdown-item:hover { background: #f3f4f6; }
        .dropdown-item.danger { color: #dc2626; }
        .dropdown-item.danger:hover { background: #fee2e2; }
      `}</style>

      <header style={{ background: '#f3f4f6', padding: '24px 0', borderBottom: '1px solid #e5e7eb', color: '#1e3a5f' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src={logoIcon} alt="Logo Icon" style={{ height: '52px' }} />
            <div><h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '800' }}>Church of Christ Collab App</h1></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['owner', 'admin'].includes(userRole) && <button className="btn-secondary" onClick={() => setShowSettings(true)}>⚙️ Settings</button>}
            <div style={{ position: 'relative' }}>
              <button className="btn-secondary" onClick={() => setShowProfile(!showProfile)}>👤 Account</button>
              {showProfile && (
                <div className="actions-dropdown">
                  <button onClick={() => { setShowEditProfile(true); setShowProfile(false); }} className="dropdown-item">Edit Profile</button>
                  <button onClick={handleLogout} className="dropdown-item danger">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
        <h2 style={{ color: '#1e3a5f', marginBottom: '20px', fontWeight: '700', borderLeft: '4px solid #FF8C37', paddingLeft: '16px' }}>{churchName || 'Your Congregation'}</h2>
        
        <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #ddd', overflowX: 'auto' }}>
          <button className={'nav-tab ' + (view === 'directory' ? 'active' : '')} onClick={() => setView('directory')}>👥 Directory</button>
          <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>📅 Calendar</button>
          <button className={'nav-tab ' + (view === 'services' ? 'active' : '')} onClick={() => setView('services')}>🛠️ Services</button>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>← Prev</button>
            <h2 style={{ color: '#1e3a5f', margin: 0 }}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>Next →</button>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end', position: 'relative' }} ref={dropdownRef}>
            {view === 'calendar' && (
              <>
                <button className="btn-secondary" onClick={() => setShowActions(!showActions)}>⚡ Actions {showActions ? '▲' : '▼'}</button>
                {showActions && (
                  <div className="actions-dropdown">
                    <button className="dropdown-item" onClick={() => { exportToPDF(selectedMonth, schedule, serviceSettings, getMonthDays, getSpeakerName); setShowActions(false); }}>📄 Export PDF</button>
                    <button className="dropdown-item" onClick={() => { exportToCSV(selectedMonth, schedule, members, serviceSettings, getSpeakerName); setShowActions(false); }}>📊 Export CSV</button>
                    {['owner', 'admin'].includes(userRole) && (
                      <>
                        <button className="dropdown-item" onClick={() => { fileInputRef.current.click(); setShowActions(false); }}>📥 Import CSV</button>
                        <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" style={{ display: 'none' }} />
                        <button className="dropdown-item danger" onClick={handleClearMonth}>🗑️ Clear Month</button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
            {['owner', 'admin'].includes(userRole) && <button className="btn-primary" onClick={handleGenerateSchedule}>✨ Generate Schedule</button>}
          </div>
        </div>

        {view === 'directory' ? (
          <DirectoryTab members={members} families={families} userRole={userRole} setEditingMember={setEditingMember} />
        ) : view === 'services' ? (
          <ServicesTab members={members} schedule={schedule} />
        ) : (
          <CalendarTab selectedMonth={selectedMonth} schedule={schedule} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />
        )}
      </main>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members} pendingInvites={pendingInvites} generateInviteLink={generateInviteLink} />
      <MemberProfileModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} editingMember={editingMember} setEditingMember={setEditingMember} members={members} setMembers={setMembers} families={families} setFamilies={setFamilies} serviceSettings={serviceSettings} canEdit={['owner', 'admin'].includes(userRole)} />
      <ProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} userRole={userRole} churchName={churchName} setChurchName={setChurchName} userFirstName={userFirstName} setUserFirstName={setUserFirstName} userLastName={userLastName} setUserLastName={setUserLastName} newEmail={newEmail} setNewEmail={setNewEmail} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} handleUpdateProfile={handleUpdateProfile} />
      <NoteModal isOpen={!!editingNote} onClose={() => setEditingNote(null)} editingNote={editingNote} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} handleSaveNote={handleSaveNote} userRole={userRole} setAssigningSlot={setAssigningSlot} />

      {assigningSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3>Assign Speaker</h3>
            {members.filter(m => m.isSpeaker && m.availability?.[assigningSlot.serviceType]).map(m => (
              <button key={m.id} className="btn-secondary" style={{ width: '100%', marginBottom: '8px', textAlign: 'left', fontFamily: 'Outfit' }} onClick={() => { setSchedule({ ...schedule, [assigningSlot.slotKey]: { speakerId: m.id, date: assigningSlot.date, serviceType: assigningSlot.serviceType } }); setAssigningSlot(null); }}>{m.firstName} {m.lastName}</button>
            ))}
            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px', fontFamily: 'Outfit' }} onClick={() => setAssigningSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
