import React, { useState, useEffect, useRef } from 'react';
import logoIcon from './assets/logo-icon.svg';

// Logic & Services
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
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [members, setMembers] = useState([]); 
  const [families, setFamilies] = useState([]); 
  const [schedule, setSchedule] = useState({});
  const [churchName, setChurchName] = useState('');
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
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const isClearingRef = useRef(false); // CRITICAL: Locks auto-save during deletions

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
      } catch (err) { setAuthLoading(false); }
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

  // --- AUTO-SAVE (Restricted during deletions) ---
  useEffect(() => {
    if (user && firebaseReady && !dataLoading && !isClearingRef.current && orgId && ['owner', 'admin'].includes(userRole)) {
      const t = setTimeout(() => {
        db.current.collection('organizations').doc(orgId).set({ 
          members, families, schedule, serviceSettings, churchName, updatedAt: new Date().toISOString() 
        }, { merge: true });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [members, families, schedule, serviceSettings, churchName]);

  // --- HANDLERS ---
  const handleGenerateSchedule = () => {
    const speakers = (members || []).filter(m => m.isSpeaker);
    if (speakers.length === 0) return alert("No speakers enabled in Directory.");
    setSchedule(generateScheduleLogic(selectedMonth, members, serviceSettings, schedule));
    setView('calendar'); 
  };

  // FIXED: Clear Month now overwrites the DB field
  const handleClearMonth = async () => {
    if (!window.confirm("Are you sure you want to clear all assignments for this month?")) return;
    
    isClearingRef.current = true;
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    
    Object.keys(newSchedule).forEach(key => {
      const parts = key.split('-');
      if (parts.length >= 3 && parseInt(parts[0]) === year && (parseInt(parts[1]) - 1) === month) {
        delete newSchedule[key];
      }
    });

    try {
      setDataLoading(true);
      await db.current.collection('organizations').doc(orgId).update({
        schedule: newSchedule,
        updatedAt: new Date().toISOString()
      });
      setSchedule(newSchedule);
      setShowActions(false);
      alert("Month cleared.");
    } catch (err) { alert("Database sync failed."); }
    finally {
      setDataLoading(false);
      setTimeout(() => { isClearingRef.current = false; }, 2000);
    }
  };

  // NEW: Delete individual slot handler
  const handleDeleteSlot = async (slotKey) => {
    if (!window.confirm("Remove this assignment?")) return;
    isClearingRef.current = true;
    const newSchedule = { ...schedule };
    delete newSchedule[slotKey];

    try {
      setDataLoading(true);
      await db.current.collection('organizations').doc(orgId).update({ schedule: newSchedule });
      setSchedule(newSchedule);
      setEditingNote(null);
    } catch (err) { alert("Delete failed."); }
    finally {
      setDataLoading(false);
      setTimeout(() => { isClearingRef.current = false; }, 1000);
    }
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

  const handleSaveNote = (slotKey, noteText) => {
    setSchedule(prev => ({ ...prev, [slotKey]: { ...prev[slotKey], note: noteText } }));
    setEditingNote(null);
  };

  const handleLogin = (e) => { 
    e.preventDefault(); 
    auth.current.signInWithEmailAndPassword(authEmail, authPassword).catch(err => alert(err.message)); 
  };

  const getSpeakerName = (id) => { 
    const s = (members || []).find(m => m.id === id); 
    return s ? `${s.firstName} ${s.lastName}` : ''; 
  };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Outfit' }}>Connecting...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <img src={logoIcon} style={{ height: '60px', marginBottom: '16px' }} alt="Logo" />
        <h2 style={{ color: '#1e3a5f', marginBottom: '24px' }}>Church Collab App</h2>
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '12px' }}>
          <input className="input-field" placeholder="Email" required />
          <input className="input-field" type="password" placeholder="Password" required />
          <button className="btn-primary" type="submit">Login</button>
        </form>
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
        .nav-tab { padding: 16px 24px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .input-field { width: 100%; padding: 14px; border: 2px solid #e5e0d8; border-radius: 10px; }
        .calendar-bar { padding: 8px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; margin: 2px 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; border: none; }
        .bar-empty { background: #f9fafb; color: #cbd5e1; border: 1px dashed #e2e8f0 !important; }
        .actions-dropdown { position: absolute; top: 110%; right: 0; background: white; border: 1px solid #eee; borderRadius: 12px; width: 220px; z-index: 1000; boxShadow: 0 10px 25px rgba(0,0,0,0.15); padding: 8px; }
        .dropdown-item { width: 100%; padding: 10px 16px; text-align: left; border: none; background: none; cursor: pointer; font-size: 14px; border-radius: 8px; color: #1e3a5f; font-weight: 500; }
      `}</style>

      <header style={{ background: '#ffffff', padding: '16px 0', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setCurrentPage('dashboard')}>
            <img src={logoIcon} alt="Logo" style={{ height: '35px' }} />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e3a5f' }}>Collab App</h1>
          </div>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button className="btn-secondary" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <img src={(members || []).find(m => m.id === user.uid)?.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=1e3a5f&color=fff`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="Me" />
              <span>Account ▼</span>
            </button>
            {showProfileMenu && (
              <div className="actions-dropdown">
                <button onClick={() => { setCurrentPage('account'); setShowProfileMenu(false); }} className="dropdown-item">My Profile</button>
                {['owner', 'admin'].includes(userRole) && <button onClick={() => { setCurrentPage('settings'); setShowProfileMenu(false); }} className="dropdown-item">⚙️ Settings</button>}
                <button onClick={() => auth.current.signOut()} className="dropdown-item" style={{ color: '#dc2626' }}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px' }}>
        {currentPage === 'account' ? (
          <AccountPage user={user} memberData={(members || []).find(m => m.id === user.uid) || {}} onUpdate={handleUpdateSelf} onBack={() => setCurrentPage('dashboard')} storage={storage.current} />
        ) : currentPage === 'settings' ? (
          <SettingsPage onBack={() => setCurrentPage('dashboard')} serviceSettings={serviceSettings} setServiceSettings={setServiceSettings} userRole={userRole} user={user} members={members} />
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
                    {['owner', 'admin'].includes(userRole) && <button className="dropdown-item" style={{ color: 'red' }} onClick={handleClearMonth}>🗑️ Clear Month</button>}
                  </div>
                )}
                {['owner', 'admin'].includes(userRole) && <button className="btn-primary" onClick={handleGenerateSchedule}>✨ Generate</button>}
              </div>
            </div>

            <nav style={{ display: 'flex', background: 'white', borderBottom: '1px solid #e5e7eb', marginBottom: '32px' }}>
              <button className={'nav-tab ' + (view === 'directory' ? 'active' : '')} onClick={() => setView('directory')}>👥 Directory</button>
              <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>📅 Teaching Calendar</button>
            </nav>

            {view === 'directory' ? <DirectoryTab members={members} userRole={userRole} setEditingMember={setEditingMember} /> : <CalendarTab selectedMonth={selectedMonth} schedule={schedule} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />}
          </>
        )}
      </main>

      <MemberProfileModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} editingMember={editingMember} setEditingMember={setEditingMember} members={members} setMembers={setMembers} serviceSettings={serviceSettings} userRole={userRole} />
      <NoteModal isOpen={!!editingNote} onClose={() => setEditingNote(null)} editingNote={editingNote} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} handleSaveNote={handleSaveNote} handleDeleteSlot={handleDeleteSlot} userRole={userRole} setAssigningSlot={setAssigningSlot} />

      {assigningSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '400px' }}>
            <h3 style={{ marginBottom: '20px' }}>Assign Speaker</h3>
            {members.filter(m => m.isSpeaker && m.availability?.[assigningSlot.serviceType]).map(m => (
              <button key={m.id} className="btn-secondary" style={{ width: '100%', marginBottom: '8px' }} onClick={() => { setSchedule({ ...schedule, [assigningSlot.slotKey]: { speakerId: m.id, date: assigningSlot.date, serviceType: assigningSlot.serviceType } }); setAssigningSlot(null); }}>{m.firstName} {m.lastName}</button>
            ))}
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAssigningSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
