import React, { useState, useEffect, useRef } from 'react';
import logoIcon from './assets/logo-icon.svg';

// Modular Logic & Services
import { FIREBASE_CONFIG, loadFirebaseScripts } from './services/firebase';
import { generateScheduleLogic, getMonthDays } from './utils/scheduleLogic';
import { sendInviteEmail } from './services/email';
import { exportToCSV, importFromCSV, exportToPDF } from './utils/exportUtils';

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
  const [pendingInvites, setPendingInvites] = useState([]); 
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [invitationData, setInvitationData] = useState(null); 

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
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [assigningSlot, setAssigningSlot] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [showActions, setShowActions] = useState(false); // NEW: Dropdown toggle

  const [serviceSettings, setServiceSettings] = useState({
    sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
    sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
    wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:30 PM' },
    communion: { enabled: true, label: 'Communion', time: '' }
  });

  const db = useRef(null);
  const auth = useRef(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null); // NEW: To handle outside clicks

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
            const data = doc.data();
            setInvitationData(data);
            setChurchName(data.churchName);
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

    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowActions(false);
      }
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
            setSpeakers(d.speakers || []);
            setSchedule(d.schedule || {});
            setServiceSettings(d.serviceSettings || serviceSettings);
            setServicePeople(d.servicePeople || []);
            setChurchName(d.churchName || '');
          }
        }
      }
    } catch (err) { console.error('Error loading data', err); }
    setDataLoading(false);
  };

  const fetchOrgData = async (targetOrgId) => {
    const memberSnapshot = await db.current.collection('users').where('orgId', '==', targetOrgId).get();
    setMembers(memberSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    const now = new Date().toISOString();
    const inviteSnapshot = await db.current.collection('invitations').where('orgId', '==', targetOrgId).where('status', '==', 'pending').get();
    const activeInvites = inviteSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(invite => invite.expiresAt > now);
    setPendingInvites(activeInvites);
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

  // --- HANDLERS ---
  const handleGenerateSchedule = () => {
    setSchedule(generateScheduleLogic(selectedMonth, speakers, serviceSettings, schedule));
    setView('calendar'); 
  };

  const handleClearMonth = () => {
    if (!window.confirm("Are you sure you want to clear all assignments for this month?")) return;
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
      const updatedSchedule = await importFromCSV(file, speakers, schedule);
      setSchedule(updatedSchedule);
      setShowActions(false);
      alert("Spreadsheet imported successfully!");
    }
  };

  // --- REST OF HANDLERS (Invitations, Profile, Auth) ---
  const generateInviteLink = async () => {
    if (!orgId || !inviteEmail) return alert("Enter an email.");
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await db.current.collection('invitations').doc(inviteCode).set({ orgId, email: inviteEmail, role: inviteRole, churchName, status: 'pending', createdAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() });
      const link = `${window.location.origin}?invite=${inviteCode}`;
      await sendInviteEmail({ to_email: inviteEmail, church_name: churchName, invite_link: link, role: inviteRole });
      alert('Invitation sent!');
      setInviteEmail('');
      fetchOrgData(orgId);
    } catch (err) { alert(err.message); }
  };

  const cancelInvite = (id) => cancelInviteLogic(id, db.current, () => fetchOrgData(orgId));
  const updateMemberRole = (id, role) => updateMemberRoleLogic(id, role, db.current, () => fetchOrgData(orgId));
  const removeMember = (id, name) => removeMemberLogic(id, name, db.current, () => fetchOrgData(orgId));
  const transferOwnership = (id) => transferOwnershipLogic(id, user.uid, db.current);

  const handleSaveNote = (slotKey, noteText) => {
    setSchedule(prev => ({ ...prev, [slotKey]: { ...prev[slotKey], note: noteText } }));
    setEditingNote(null);
  };

  const handleUpdateProfile = (e) => handleUpdateProfileLogic(e, auth.current, db.current, { userFirstName, userLastName, newEmail, newPassword, orgId, churchName, userRole }, () => setShowEditProfile(false));
  const handleLogin = (e) => { e.preventDefault(); auth.current.signInWithEmailAndPassword(authEmail, authPassword).catch(err => setAuthError(err.message)); };
  const handleRegister = (e) => handleRegisterLogic(e, auth.current, db.current, { invitationData, authEmail, authPassword, authName, churchName }, () => window.location.href = window.location.origin);
  const handleLogout = () => auth.current.signOut().then(() => window.location.reload());
  const getSpeakerName = (id) => { const s = speakers.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Loading...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`* { box-sizing: border-box; font-family: 'Outfit', sans-serif; } .auth-in { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 12px; }`}</style>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src={logoIcon} alt="Logo" style={{ height: '80px', marginBottom: '16px' }} />
        <h2 style={{ textAlign: 'center', color: '#1e3a5f', marginBottom: '24px' }}>Church of Christ Collab App</h2>
        <form onSubmit={authView === 'login' ? handleLogin : handleRegister} style={{ width: '100%' }}>
          {authView === 'register' && <input className="auth-in" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
          {authView === 'register' && <input className="auth-in" style={{backgroundColor: churchNameLocked ? '#f3f4f6' : 'white'}} placeholder="Church Name" value={churchName} onChange={e => setChurchName(e.target.value)} disabled={churchNameLocked} required />}
          <input className="auth-in" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="auth-in" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button className="btn-primary" style={{width: '100%', padding: '12px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}} type="submit">{authView === 'login' ? 'Login' : 'Sign Up'}</button>
        </form>
        <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ border: 'none', background: 'none', marginTop: '12px', color: '#1e3a5f', cursor: 'pointer' }}>
          {authView === 'login' ? "Need an account? Sign Up" : "Back to Login"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; flex-shrink: 0; }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #1e3a5f; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; overflow-x: hidden; }
        .nav-tab { padding: 12px 20px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; display: flex; align-items: center; gap: 8px; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .calendar-bar { padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; margin: 4px 0; cursor: pointer; display: block; width: 100%; text-align: left; border: none; }
        .bar-empty { background: #e5e7eb; color: #666; }
        .input-field { width: 100%; padding: 12px; border: 2px solid #e5e0d8; border-radius: 8px; font-family: 'Outfit', sans-serif; }
        
        /* NEW Dropdown Styles */
        .actions-dropdown { position: absolute; top: 100%; right: 0; margin-top: 8px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; min-width: 180px; z-index: 1000; display: flex; flexDirection: column; border: 1px solid #eee; }
        .dropdown-item { padding: 12px 20px; text-align: left; border: none; background: transparent; cursor: pointer; font-family: 'Outfit'; font-size: 14px; font-weight: 500; color: #1e3a5f; display: flex; align-items: center; gap: 10px; }
        .dropdown-item:hover { background: #f3f4f6; }
        .dropdown-item.danger { color: #dc2626; }
        .dropdown-item.danger:hover { background: #fee2e2; }
      `}</style>

      <header style={{ background: '#f3f4f6', padding: '24px 0', borderBottom: '1px solid #e5e7eb', color: '#1e3a5f' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src={logoIcon} alt="Logo Icon" style={{ height: '52px' }} />
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '800' }}>Church of Christ Collab App</h1>
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
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end', position: 'relative' }} ref={dropdownRef}>
            {view === 'calendar' && (
              <>
                {/* NEW Actions Dropdown Button */}
                <button className="btn-secondary" onClick={() => setShowActions(!showActions)}>
                  ⚡ Actions <span style={{fontSize: '10px'}}>{showActions ? '▲' : '▼'}</span>
                </button>
                
                {showActions && (
                  <div className="actions-dropdown">
                    <button className="dropdown-item" onClick={() => exportToPDF(selectedMonth, schedule, serviceSettings, getMonthDays, getSpeakerName)}>📄 Export PDF</button>
                    <button className="dropdown-item" onClick={() => exportToCSV(selectedMonth, schedule, speakers, serviceSettings, getSpeakerName)}>📊 Export CSV</button>
                    {['owner', 'admin'].includes(userRole) && (
                      <>
                        <button className="dropdown-item" onClick={() => fileInputRef.current.click()}>📥 Import CSV</button>
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

        {view === 'speakers' ? (
          <SpeakersTab speakers={speakers} userRole={userRole} setEditingSpeaker={setEditingSpeaker} setShowAddSpeaker={setShowAddSpeaker} setSpeakers={setSpeakers} serviceSettings={serviceSettings} />
        ) : view === 'services' ? (
          <ServicesTab servicePeople={servicePeople} setServicePeople={setServicePeople} speakers={speakers} schedule={schedule} />
        ) : (
          <CalendarTab selectedMonth={selectedMonth} schedule={schedule} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />
        )}
      </main>

      {/* MODALS */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members} pendingInvites={pendingInvites} cancelInvite={cancelInvite} inviteEmail={inviteEmail} setInviteEmail={setInviteEmail} inviteRole={inviteRole} setInviteRole={setInviteRole} generateInviteLink={generateInviteLink} updateMemberRole={updateMemberRole} removeMember={removeMember} setTransferTarget={setTransferTarget} />
      <SpeakerModal isOpen={showAddSpeaker} onClose={() => setShowAddSpeaker(false)} editingSpeaker={editingSpeaker} setEditingSpeaker={setEditingSpeaker} speakers={speakers} setSpeakers={setSpeakers} />
      <ProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} userRole={userRole} churchName={churchName} setChurchName={setChurchName} userFirstName={userFirstName} setUserFirstName={setUserFirstName} userLastName={userLastName} setUserLastName={setUserLastName} newEmail={newEmail} setNewEmail={setNewEmail} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} handleUpdateProfile={handleUpdateProfile} />
      <NoteModal isOpen={!!editingNote} onClose={() => setEditingNote(null)} editingNote={editingNote} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} handleSaveNote={handleSaveNote} userRole={userRole} setAssigningSlot={setAssigningSlot} />

      {transferTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="card" style={{ background: 'white', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2>Transfer Ownership?</h2>
            <p>Make <strong>{transferTarget.displayName}</strong> the Owner?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => transferOwnership(transferTarget.id)} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Transfer Ownership</button>
              <button onClick={() => setTransferTarget(null)} style={{ background: '#f3f4f6', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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

// --- LOGIC HELPER WRAPPERS ---
const cancelInviteLogic = async (id, db, cb) => { if (window.confirm("Cancel?")) { await db.collection('invitations').doc(id).delete(); cb(); } };
const updateMemberRoleLogic = async (id, role, db, cb) => { await db.collection('users').doc(id).update({ role }); cb(); };
const removeMemberLogic = async (id, name, db, cb) => { if (window.confirm(`Remove ${name}?`)) { await db.collection('users').doc(id).update({ orgId: null, role: 'viewer' }); cb(); } };
const transferOwnershipLogic = async (newId, oldId, db) => { const b = db.batch(); b.update(db.collection('users').doc(oldId), { role: 'admin' }); b.update(db.collection('users').doc(newId), { role: 'owner' }); await b.commit(); window.location.reload(); };
const handleUpdateProfileLogic = async (e, auth, db, p, cb) => { e.preventDefault(); const u = auth.currentUser; if (p.newPassword) await u.updatePassword(p.newPassword); if (p.newEmail !== u.email) await u.updateEmail(p.newEmail); await db.collection('users').doc(u.uid).set({ firstName: p.userFirstName, lastName: p.userLastName, name: (p.userFirstName + ' ' + p.userLastName).trim(), email: p.newEmail }, { merge: true }); if (p.userRole === 'owner') await db.collection('organizations').doc(p.orgId).set({ churchName: p.churchName }, { merge: true }); await u.updateProfile({ displayName: (p.userFirstName + ' ' + p.userLastName).trim() }); cb(); };
const handleRegisterLogic = async (e, auth, db, p, cb) => { e.preventDefault(); try { const r = await auth.createUserWithEmailAndPassword(p.authEmail, p.authPassword); const finalOrgId = p.invitationData?.orgId || ('org_' + Math.random().toString(36).substring(2, 12)); if (!p.invitationData) await db.collection('organizations').doc(finalOrgId).set({ churchName: p.churchName, ownerUid: r.user.uid, createdAt: new Date().toISOString() }); else await db.collection('invitations').doc(new URLSearchParams(window.location.search).get('invite')).update({ status: 'accepted' }); await db.collection('users').doc(r.user.uid).set({ email: p.authEmail, name: p.authName, orgId: finalOrgId, role: p.invitationData?.role || 'owner', createdAt: new Date().toISOString() }); cb(); } catch (err) { alert(err.message); } };
