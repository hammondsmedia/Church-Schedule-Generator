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
import SettingsPage from './components/pages/SettingsPage';

// Modal Components
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
  const [pendingInvites, setPendingInvites] = useState([]); 
  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('directory');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [dataLoading, setDataLoading] = useState(false);

  // --- UI TOGGLES ---
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
        setShowActions(false);
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
    } catch (err) { console.error('Load Error:', err); }
    setDataLoading(false);
  };

  const fetchOrgData = async (targetOrgId) => {
    const inviteSnapshot = await db.current.collection('invitations').where('orgId', '==', targetOrgId).where('status', '==', 'pending').get();
    setPendingInvites(inviteSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
  const handleUpdateSelf = async (updatedData) => {
    try {
      const updatedMembers = members.map(m => m.id === user.uid ? { ...m, ...updatedData } : m);
      await db.current.collection('users').doc(user.uid).update(updatedData);
      await db.current.collection('organizations').doc(orgId).update({ members: updatedMembers });
      setMembers(updatedMembers);
      alert("Profile updated!");
    } catch (err) { alert("Save failed."); }
  };

  const handleGenerateSchedule = () => {
    const speakers = (members || []).filter(m => m.isSpeaker);
    if (speakers.length === 0) {
      return alert("Generation Failed: No members have 'Enable for Schedule Generator' checked in their profiles.");
    }
    
    const beforeCount = Object.keys(schedule).length;
    const newSchedule = generateScheduleLogic(selectedMonth, members, serviceSettings, schedule);
    const afterCount = Object.keys(newSchedule).length;
    
    if (beforeCount === afterCount) {
      alert(`No new assignments added. Diagnostic: ${speakers.length} speakers identified, but they were either blocked off or already fully assigned.`);
    } else {
      setSchedule(newSchedule);
      setView('calendar'); 
      alert(`Successfully generated ${afterCount - beforeCount} new assignments!`);
    }
  };

  const cancelInvite = async (id) => {
    await db.current.collection('invitations').doc(id).delete();
    fetchOrgData(orgId);
  };

  const updateMemberRole = async (memberId, role) => {
    await db.current.collection('users').doc(memberId).update({ role });
    alert("Role updated.");
  };

  const removeMember = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    await db.current.collection('users').doc(id).update({ orgId: null, role: 'viewer' });
  };

  const generateInviteLink = async (email, role) => {
    const inviteCode = Math.random().toString(36).substring(2, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.current.collection('invitations').doc(inviteCode).set({ 
        orgId, email, role, churchName, status: 'pending', expiresAt: expiresAt.toISOString() 
    });
    const link = `${window.location.origin}?invite=${inviteCode}`;
    await sendInviteEmail({ to_email: email, church_name: churchName, invite_link: link, role });
    fetchOrgData(orgId);
    alert("Invite sent!");
  };

  const handleSaveNote = (slotKey, noteText) => {
    setSchedule(prev => ({ ...prev, [slotKey]: { ...prev[slotKey], note: noteText } }));
    setEditingNote(null);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const updatedSchedule = await importFromCSV(file, members, schedule);
      setSchedule(updatedSchedule);
      setShowActions(false);
    }
  };

  const handleClearMonth = () => {
    if (!window.confirm("Clear assignments for this month?")) return;
    const year = selectedMonth.getFullYear(), month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => {
      const parts = key.split('-');
      if (parseInt(parts[0]) === year && parseInt(parts[1]) - 1 === month) delete newSchedule[key];
    });
    setSchedule(newSchedule);
    setShowActions(false);
  };

  const handleLogin = (e) => { 
    e.preventDefault(); 
    auth.current.signInWithEmailAndPassword(authEmail, authPassword).catch(err => setAuthError(err.message)); 
  };

  const getSpeakerName = (id) => { 
    const s = (members || []).find(m => m.id === id); 
    return s ? `${s.firstName} ${s.lastName}` : ''; 
  };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Outfit' }}>Connecting...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <img src={logoIcon} style={{ height: '60px', marginBottom: '16px' }} alt="Logo" />
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
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #e5e7eb; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 24px; border: 1px solid #e5e7eb; }
        .nav-tab { padding: 16px 24px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; font-size: 15px; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .input-field { width: 100%; padding: 14px; border: 2px solid #e5e0d8; border-radius: 10px; font-size: 15px; outline: none; }
        .calendar-bar { padding: 8px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; margin: 2px 0; cursor: pointer; display: block; width: 100%; text-align: left; border: none; }
        .bar-empty { background: #f9fafb; color: #cbd5e1; border: 1px dashed #e2e8f0 !important; }
        .avatar-circle { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .actions-dropdown { position: absolute; top: 110%; right: 0; background: white; border: 1px solid #eee; borderRadius: 12px; width: 220px; z-index: 1000; boxShadow: 0 10px 25px rgba(0,0,0,0.15); padding: 8px; }
        .dropdown-item { width: 100%; padding: 10px 16px; text-align: left; border: none; background: none; cursor: pointer; font-size: 14px; border-radius: 8px; color: #1e3a5f; font-weight: 500; }
        .dropdown-item:hover { background: #f3f4f6; }
      `}</style>

      <header style={{ background: '#ffffff', padding: '16px 0', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setCurrentPage('dashboard')}>
            <img src={logoIcon} alt="Logo" style={{ height: '35px' }} />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e3a5f' }}>Collab App</h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button className="btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <img src={(members || []).find(m => m.id === user.uid)?.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=1e3a5f&color=fff`} className="avatar-circle" alt="Me" />
                <span style={{ fontWeight: '800' }}>Account ▼</span>
              </button>
              {showProfileMenu && (
                <div className="actions-dropdown">
                  <button onClick={() => { setCurrentPage('account'); setShowProfileMenu(false); }} className="dropdown-item">My Profile</button>
                  {['owner', 'admin'].includes(userRole) && <button onClick={() => { setCurrentPage('settings'); setShowProfileMenu(false); }} className="dropdown-item">⚙️ Settings</button>}
                  <button onClick={() => auth.current.signOut()} className="dropdown-item" style={{ color: '#dc2626', borderTop: '1px solid #f3f4f6' }}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px' }}>
        {currentPage === 'account' ? (
          <AccountPage user={user} memberData={(members || []).find(m => m.id === user.uid) || {}} onUpdate={handleUpdateSelf} onBack={() => setCurrentPage('dashboard')} storage={storage.current} />
        ) : currentPage === 'settings' ? (
          <SettingsPage onBack={() => setCurrentPage('dashboard')} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members} pendingInvites={pendingInvites} cancelInvite={cancelInvite} generateInviteLink={generateInviteLink} updateMemberRole={updateMemberRole} removeMember={removeMember} />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#1e3a5f', margin: 0, fontSize: '28px', fontWeight: '800' }}>{churchName || 'Your Congregation'}</h2>
              <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>←</button>
                    <span style={{ fontWeight: '800', minWidth: '140px', textAlign: 'center' }}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>→</button>
                </div>
                <button className="btn-secondary" onClick={() => setShowActions(!showActions)}>⚡ Actions ▼</button>
                {showActions && (
                  <div className="actions-dropdown">
                    <button className="dropdown-item" onClick={() => { exportToPDF(selectedMonth, schedule, serviceSettings, getMonthDays, getSpeakerName); setShowActions(false); }}>📄 Export PDF</button>
                    <button className="dropdown-item" onClick={() => { exportToCSV(selectedMonth, schedule, members, serviceSettings, getSpeakerName); setShowActions(false); }}>📊 Export CSV</button>
                    {['owner', 'admin'].includes(userRole) && (
                      <>
                        <button className="dropdown-item" onClick={() => { fileInputRef.current.click(); setShowActions(false); }}>📥 Import CSV</button>
                        <input type="file" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
                        <button className="dropdown-item" style={{ color: 'red' }} onClick={handleClearMonth}>🗑️ Clear Month</button>
                      </>
                    )}
                  </div>
                )}
                {['owner', 'admin'].includes(userRole) && <button className="btn-primary" onClick={handleGenerateSchedule}>✨ Generate</button>}
              </div>
            </div>

            <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #e5e7eb', marginBottom: '32px' }}>
              <button className={'nav-tab ' + (view === 'directory' ? 'active' : '')} onClick={() => setView('directory')}>👥 Directory</button>
              <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>📅 Teaching Calendar</button>
              <button className={'nav-tab ' + (view === 'services' ? 'active' : '')} onClick={() => setView('services')}>🛠️ Service Plans</button>
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
      <NoteModal isOpen={!!editingNote} onClose={() => setEditingNote(null)} editingNote={editingNote} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} handleSaveNote={handleSaveNote} userRole={userRole} setAssigningSlot={setAssigningSlot} />

      {assigningSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '20px' }}>Assign Speaker</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
              {members.filter(m => m.isSpeaker && m.availability?.[assigningSlot.serviceType]).map(m => (
                <button key={m.id} className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setSchedule({ ...schedule, [assigningSlot.slotKey]: { speakerId: m.id, date: assigningSlot.date, serviceType: assigningSlot.serviceType } }); setAssigningSlot(null); }}>{m.firstName} {m.lastName}</button>
              ))}
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '16px' }} onClick={() => setAssigningSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
