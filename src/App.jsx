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
import AuthFlow from './components/AuthFlow';

// ── SVG Icons for bottom nav ───────────────────────────────────────────────
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconZap = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

export default function ChurchScheduleApp() {
  // --- STATE ---
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [churchName, setChurchName] = useState('');
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Organization Data
  const [members, setMembers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [servicePeople, setServicePeople] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [schedule, setSchedule] = useState({});

  // Navigation State
  const [view, setView] = useState('directory');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dataLoading, setDataLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  // UI Toggles
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
  const actionsRef = useRef(null);
  const isClearingRef = useRef(false);

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
          else setNeedsSetup(false);
        });
        setFirebaseReady(true);
      } catch (err) { setAuthLoading(false); }
    };
    init();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowProfileMenu(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setShowActions(false);
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
        setUserRole((userData.role || '').toLowerCase());
        setNeedsSetup(false);
        if (userData.orgId) {
          fetchOrgData(userData.orgId);
          const orgDoc = await db.current.collection('organizations').doc(userData.orgId).get();
          if (orgDoc.exists) {
            const d = orgDoc.data();
            setMembers(d.members || []);
            setFamilies(d.families || []);
            setServicePeople(d.servicePeople || []);
            setSchedule(d.schedule || {});
            setServiceSettings(prev => ({ ...prev, ...(d.serviceSettings || {}) }));
            setChurchName(d.churchName || '');
            const memberInOrg = (d.members || []).find(m => m.id === uid);
            if (memberInOrg?.role) setUserRole(memberInOrg.role.toLowerCase());
          }
        }
      } else {
        setNeedsSetup(true);
      }
    } catch (err) { console.error('Load Error:', err); }
    setDataLoading(false);
  };

  const fetchOrgData = async (targetOrgId) => {
    const inviteSnapshot = await db.current.collection('invitations')
      .where('orgId', '==', targetOrgId)
      .where('status', '==', 'pending')
      .get();
    setPendingInvites(inviteSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // --- AUTO-SAVE ---
  useEffect(() => {
    if (user && firebaseReady && !dataLoading && !isClearingRef.current && orgId && ['owner', 'admin'].includes(userRole)) {
      const t = setTimeout(() => {
        db.current.collection('organizations').doc(orgId).update({
          members, families, schedule, serviceSettings, servicePeople, churchName,
          updatedAt: new Date().toISOString()
        });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [members, families, schedule, serviceSettings, servicePeople, churchName]);

  // --- CORE LOGIC ---
  const handleGenerateSchedule = () => {
    const speakers = (members || []).filter(m => m.isSpeaker);
    if (speakers.length === 0) return alert("No speakers found. Ensure members have 'Enable for Schedule Generator' checked in Directory.");
    const enabledTypes = Object.keys(serviceSettings).filter(k => serviceSettings[k]?.enabled);
    const hasAvailability = speakers.some(m => enabledTypes.some(t => m.availability?.[t]));
    if (!hasAvailability) return alert("Speakers are enabled, but none have availability set for any active service.");
    try {
      setSchedule(generateScheduleLogic(selectedMonth, members, serviceSettings, schedule));
      setView('calendar');
    } catch (err) {
      alert("Failed to generate schedule. Please check your service settings and try again.");
      console.error(err);
    }
  };

  const handleClearMonth = async () => {
    if (!window.confirm("Delete all assignments for this month?")) return;
    isClearingRef.current = true;
    const year = selectedMonth.getFullYear(), month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => {
      const parts = key.split('-');
      if (parts.length >= 3 && parseInt(parts[0]) === year && (parseInt(parts[1]) - 1) === month) delete newSchedule[key];
    });
    try {
      setDataLoading(true);
      await db.current.collection('organizations').doc(orgId).update({ schedule: newSchedule });
      setSchedule(newSchedule);
      setShowActions(false);
      alert("Month cleared.");
    } catch (err) { alert("Failed to clear month."); }
    finally { setDataLoading(false); setTimeout(() => { isClearingRef.current = false; }, 2500); }
  };

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
    } catch (err) { alert("Failed to delete."); }
    finally { setDataLoading(false); setTimeout(() => { isClearingRef.current = false; }, 1500); }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const updatedSchedule = await importFromCSV(file, members, schedule);
      setSchedule(updatedSchedule);
      setShowActions(false);
      alert("Import complete!");
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

  const handleSaveProfile = async (updatedMembers) => {
    if (!['owner', 'admin'].includes(userRole)) {
      try {
        await db.current.collection('organizations').doc(orgId).update({ members: updatedMembers });
      } catch (err) { alert("Save failed. Please try again."); }
    }
  };

  const cancelInvite = async (id) => { await db.current.collection('invitations').doc(id).delete(); fetchOrgData(orgId); };
  const updateMemberRole = async (uid, role) => {
    try {
      const updatedMembers = members.map(m => m.id === uid ? { ...m, role } : m);
      await db.current.collection('organizations').doc(orgId).update({ members: updatedMembers });
      setMembers(updatedMembers);
    } catch (err) { alert('Failed to update role. Please try again.'); }
  };
  const removeMember = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    setMembers(members.filter(m => m.id !== id));
    await db.current.collection('users').doc(id).update({ orgId: null, role: 'viewer' });
  };
  const generateInviteLink = async (email, role) => {
    const code = Math.random().toString(36).substring(2, 10);
    await db.current.collection('invitations').doc(code).set({
      orgId, email, role, churchName, status: 'pending',
      expiresAt: new Date(Date.now() + 604800000).toISOString()
    });
    fetchOrgData(orgId);
    alert("Code generated: " + code);
  };
  const handleSaveNote = (slotKey, noteText) => {
    setSchedule(prev => ({ ...prev, [slotKey]: { ...prev[slotKey], note: noteText } }));
    setEditingNote(null);
  };
  const getSpeakerName = (id) => {
    const s = (members || []).find(m => m.id === id);
    return s ? `${s.firstName} ${s.lastName}` : '';
  };

  // Derived data
  const currentUserMember = (members || []).find(m => m.id === user?.uid);
  const avatarURL = currentUserMember?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=6366f1&color=fff&bold=true`;

  // --- LOADING ---
  if (authLoading || (user && dataLoading && needsSetup)) {
    return (
      <div className="loading-screen">
        <div>
          <div className="loading-spinner" />
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>Connecting…</p>
        </div>
      </div>
    );
  }

  if (!user || needsSetup) {
    return (
      <AuthFlow
        auth={auth.current}
        db={db.current}
        existingUser={needsSetup ? user : null}
        onSetupComplete={() => loadUserData(user.uid)}
      />
    );
  }

  // ── NAV TABS config ────────────────────────────────────────────────────────
  const navTabs = [
    { id: 'directory', icon: '👥', label: 'Directory' },
    { id: 'calendar',  icon: '📅', label: 'Teaching Calendar' },
    { id: 'services',  icon: '🛠️', label: 'Service Plans' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── HEADER ── */}
      <header className="app-header">
        <div className="app-header-inner">
          {/* Logo */}
          <div className="app-logo" onClick={() => setCurrentPage('dashboard')}>
            <img src={logoIcon} alt="Logo" style={{ height: 32 }} />
            <span className="app-logo-name">Collab<span>App</span></span>
          </div>

          {/* Church name (center, desktop only) */}
          {currentPage === 'dashboard' && (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '-0.01em', display: 'none' }} className="header-church-name">
              {churchName}
            </span>
          )}

          {/* Avatar / Profile dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button className="avatar-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <img src={avatarURL} className="avatar-img" alt="Me" />
              <span className="avatar-label">Account</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showProfileMenu && (
              <div className="actions-dropdown">
                <button onClick={() => { setCurrentPage('account'); setShowProfileMenu(false); }} className="dropdown-item">
                  👤 My Profile
                </button>
                {['owner', 'admin'].includes(userRole) && (
                  <button onClick={() => { setCurrentPage('settings'); setShowProfileMenu(false); }} className="dropdown-item">
                    ⚙️ Settings
                  </button>
                )}
                <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                <button onClick={() => auth.current.signOut()} className="dropdown-item danger">
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="app-main">
        {currentPage === 'account' ? (
          <AccountPage
            user={user}
            memberData={currentUserMember || {}}
            onUpdate={handleUpdateSelf}
            onBack={() => setCurrentPage('dashboard')}
            storage={storage.current}
          />
        ) : currentPage === 'settings' ? (
          <SettingsPage
            onBack={() => setCurrentPage('dashboard')}
            serviceSettings={serviceSettings}
            setServiceSettings={setServiceSettings}
            userRole={userRole}
            user={user}
            members={members}
            pendingInvites={pendingInvites}
            cancelInvite={cancelInvite}
            generateInviteLink={generateInviteLink}
            updateMemberRole={updateMemberRole}
            removeMember={removeMember}
            churchName={churchName}
            setChurchName={setChurchName}
          />
        ) : (
          <>
            {/* PAGE HEADER */}
            <div className="page-header">
              <h2 className="page-title">{churchName || 'Your Congregation'}</h2>

              {/* Calendar controls */}
              {view === 'calendar' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Month navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                      onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                    >
                      <IconChevronLeft />
                    </button>
                    <span style={{ fontWeight: 700, minWidth: '130px', textAlign: 'center', fontSize: '14px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                      onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                    >
                      <IconChevronRight />
                    </button>
                  </div>

                  {/* Actions dropdown */}
                  <div style={{ position: 'relative' }} ref={actionsRef}>
                    <button className="btn-secondary" onClick={() => setShowActions(!showActions)}>
                      ⚡ Actions
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {showActions && (
                      <div className="actions-dropdown">
                        <button className="dropdown-item" onClick={() => { exportToPDF(selectedMonth, schedule, serviceSettings, getMonthDays, getSpeakerName); setShowActions(false); }}>
                          📄 Export PDF
                        </button>
                        <button className="dropdown-item" onClick={() => { exportToCSV(selectedMonth, schedule, members, serviceSettings, getSpeakerName); setShowActions(false); }}>
                          📊 Export CSV
                        </button>
                        {['owner', 'admin'].includes(userRole) && (
                          <>
                            <button className="dropdown-item" onClick={() => { fileInputRef.current.click(); setShowActions(false); }}>
                              📥 Import CSV
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
                            <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                            <button className="dropdown-item danger" onClick={handleClearMonth}>
                              🗑️ Clear Month
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {['owner', 'admin'].includes(userRole) && (
                    <button className="btn-primary" onClick={handleGenerateSchedule}>
                      <IconZap /> Generate
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* DESKTOP TAB NAVIGATION */}
            <nav className="desktop-nav" style={{ marginBottom: 28 }}>
              <div className="nav-tabs-container" style={{ display: 'inline-flex' }}>
                {navTabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`nav-tab${view === tab.id ? ' active' : ''}`}
                    onClick={() => setView(tab.id)}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* CONTENT */}
            <div className="fade-in">
              {view === 'directory' ? (
                <DirectoryTab members={members} families={families} userRole={userRole} setEditingMember={setEditingMember} user={user} />
              ) : view === 'services' ? (
                <ServicesTab members={members} schedule={schedule} />
              ) : (
                <CalendarTab selectedMonth={selectedMonth} schedule={schedule} serviceSettings={serviceSettings} userRole={userRole} setAssigningSlot={setAssigningSlot} setEditingNote={setEditingNote} getSpeakerName={getSpeakerName} />
              )}
            </div>
          </>
        )}
      </main>

      {/* ── MOBILE BOTTOM NAV (dashboard only) ── */}
      {currentPage === 'dashboard' && (
        <nav className="bottom-nav">
          <div className="bottom-nav-items">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                className={`bottom-nav-btn${view === tab.id ? ' active' : ''}`}
                onClick={() => setView(tab.id)}
              >
                {tab.id === 'directory' && <IconUsers />}
                {tab.id === 'calendar'  && <IconCalendar />}
                {tab.id === 'services'  && <IconClipboard />}
                {tab.label.split(' ')[0]}
                <div className="bottom-nav-dot" />
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ── MODALS ── */}
      <MemberProfileModal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        editingMember={editingMember}
        setEditingMember={setEditingMember}
        members={members}
        setMembers={setMembers}
        families={families}
        setFamilies={setFamilies}
        serviceSettings={serviceSettings}
        userRole={userRole}
        storage={storage.current}
        removeMember={removeMember}
        user={user}
        onSaveProfile={handleSaveProfile}
        generateInviteLink={generateInviteLink}
      />

      <NoteModal
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        editingNote={editingNote}
        setEditingNote={setEditingNote}
        getSpeakerName={getSpeakerName}
        handleSaveNote={handleSaveNote}
        handleDeleteSlot={handleDeleteSlot}
        userRole={userRole}
        setAssigningSlot={setAssigningSlot}
      />

      {/* ── ASSIGN SPEAKER MODAL ── */}
      {assigningSlot && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAssigningSlot(null)}>
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                Assign Speaker
              </h3>
              <button onClick={() => setAssigningSlot(null)} className="btn-ghost" style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', lineHeight: 1 }}>✕</button>
            </div>

            {members.filter(m => m.isSpeaker && m.availability?.[assigningSlot.serviceType]).length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon">😔</div>
                <p>No available speakers for this service type.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'grid', gap: 6 }}>
                {members
                  .filter(m => m.isSpeaker && m.availability?.[assigningSlot.serviceType])
                  .map(m => {
                    const initials = `${m.firstName?.charAt(0) || ''}${m.lastName?.charAt(0) || ''}`.toUpperCase();
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSchedule({ ...schedule, [assigningSlot.slotKey]: { speakerId: m.id, date: assigningSlot.date, serviceType: assigningSlot.serviceType } });
                          setAssigningSlot(null);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px',
                          border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                          background: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
                          transition: 'all 150ms ease', fontSize: 14, fontWeight: 600, color: 'var(--text)',
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.background = 'var(--primary-xlight)'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                      >
                        {m.photoURL ? (
                          <img src={m.photoURL} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                        ) : (
                          <div className="avatar-circle" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{initials}</div>
                        )}
                        {m.firstName} {m.lastName}
                      </button>
                    );
                  })
                }
              </div>
            )}
            <button className="btn-secondary" style={{ width: '100%', marginTop: 14 }} onClick={() => setAssigningSlot(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
