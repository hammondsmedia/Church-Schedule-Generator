import logo from './assets/logo.svg';
import React, { useState, useEffect, useRef } from 'react';
import emailjs from '@emailjs/browser';

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1uwoEbX9BSnmbXPBQFOdzJGSdvxv22MM",
  authDomain: "teaching-schedule-generator.firebaseapp.com",
  projectId: "teaching-schedule-generator",
  storageBucket: "teaching-schedule-generator.firebasestorage.app",
  messagingSenderId: "154699704030",
  appId: "1:154699704030:web:eba731b832f79a8170444f"
};

const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';

export default function ChurchScheduleApp() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState('login'); 
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [churchNameLocked, setChurchNameLocked] = useState(false); // NEW: Lock for invites
  const [dataLoading, setDataLoading] = useState(false);
  
  const [orgId, setOrgId] = useState(null);
  const [userRole, setUserRole] = useState(null); 
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [generatedInvite, setGeneratedInvite] = useState('');

  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);

  const firebaseApp = useRef(null);
  const db = useRef(null);
  const auth = useRef(null);

  const [speakers, setSpeakers] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [view, setView] = useState('speakers');
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [draggedSlot, setDraggedSlot] = useState(null);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [assigningSlot, setAssigningSlot] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [serviceSettings, setServiceSettings] = useState({
    sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
    sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
    wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:30 PM' },
    communion: { enabled: true, label: 'Communion', time: '' }
  });
  const [transferTarget, setTransferTarget] = useState(null);

  useEffect(() => {
    const loadFirebase = async () => {
      try {
        if (window.firebase) { initializeFirebase(); return; }
        const loadScript = (url) => new Promise((resolve, reject) => {
          const s = document.createElement('script'); s.src = url; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
        await loadScript(FIREBASE_APP_URL);
        await loadScript(FIREBASE_AUTH_URL);
        await loadScript(FIREBASE_FIRESTORE_URL);
        initializeFirebase();
      } catch (err) { console.error('Firebase load failed', err); setAuthLoading(false); }
    };
    const initializeFirebase = () => {
      if (!window.firebase.apps.length) firebaseApp.current = window.firebase.initializeApp(FIREBASE_CONFIG);
      else firebaseApp.current = window.firebase.apps[0];
      auth.current = window.firebase.auth();
      db.current = window.firebase.firestore();

      // NEW: Invite check logic
      const checkInvitation = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite');
        if (inviteCode) {
          try {
            const inviteDoc = await db.current.collection('invitations').doc(inviteCode).get();
            if (inviteDoc.exists) {
              const data = inviteDoc.data();
              setChurchName(data.churchName);
              setChurchNameLocked(true);
              setAuthView('register');
            }
          } catch (err) { console.error("Error checking invitation", err); }
        }
      };
      checkInvitation();

      auth.current.onAuthStateChanged((u) => {
        setUser(u); setAuthLoading(false);
        if (u) loadUserData(u.uid);
      });
      setFirebaseReady(true);
    };
    loadFirebase();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => { if (showProfile && !e.target.closest('[data-profile-menu]')) setShowProfile(false); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfile]);

  const fetchMembers = async (targetOrgId) => {
    if (!db.current || !targetOrgId) return;
    try {
      const snapshot = await db.current.collection('users').where('orgId', '==', targetOrgId).get();
      const memberList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(memberList);
    } catch (err) { console.error('Error fetching members', err); }
  };

  const loadUserData = async (uid) => {
    if (!db.current) return;
    setDataLoading(true);
    try {
      const userDoc = await db.current.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const userOrgId = userData.orgId;
        setOrgId(userOrgId);
        setUserRole(userData.role);
        setUserFirstName(userData.firstName || '');
        setUserLastName(userData.lastName || '');
        setNewEmail(auth.current.currentUser?.email || '');
        if (userOrgId) {
          fetchMembers(userOrgId);
          const orgDoc = await db.current.collection('organizations').doc(userOrgId).get();
          if (orgDoc.exists) {
            const orgData = orgDoc.data();
            if (orgData.speakers) setSpeakers(orgData.speakers);
            if (orgData.schedule) setSchedule(orgData.schedule);
            if (orgData.serviceSettings) setServiceSettings(orgData.serviceSettings);
            if (orgData.churchName) setChurchName(orgData.churchName);
          }
        }
      }
    } catch (err) { console.error('Error loading data', err); }
    setDataLoading(false);
  };

  const saveOrgData = async () => {
    if (!db.current || !orgId || dataLoading || !['owner', 'admin'].includes(userRole)) return;
    try {
      await db.current.collection('organizations').doc(orgId).set({ speakers, schedule, serviceSettings, churchName, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { console.error('Save failed', err); }
  };

  useEffect(() => {
    if (user && firebaseReady && !dataLoading && orgId) {
      const t = setTimeout(() => saveOrgData(), 1000);
      return () => clearTimeout(t);
    }
  }, [speakers, schedule, serviceSettings, churchName, user, firebaseReady, dataLoading, orgId, userRole]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault(); setAuthError('');
    try {
      const u = auth.current.currentUser;
      const full = (userFirstName + ' ' + userLastName).trim();
      if (newEmail !== u.email) await u.updateEmail(newEmail);
      if (newPassword) await u.updatePassword(newPassword);
      await db.current.collection('users').doc(u.uid).set({ firstName: userFirstName, lastName: userLastName, name: full, email: newEmail }, { merge: true });
      if (userRole === 'owner') await db.current.collection('organizations').doc(orgId).set({ churchName }, { merge: true });
      await u.updateProfile({ displayName: full });
      alert('Profile updated!'); setShowEditProfile(false); setNewPassword('');
    } catch (err) { setAuthError(err.message); }
  };

  const updateMemberRole = async (targetUserId, newRole) => {
    try {
      await db.current.collection('users').doc(targetUserId).update({ role: newRole });
      alert(`Role updated to ${newRole}`);
      fetchMembers(orgId);
    } catch (err) { alert("Error updating role: " + err.message); }
  };
  
  const removeMember = async (targetUserId, targetUserName) => {
    if (!window.confirm(`Are you sure you want to remove ${targetUserName}?`)) return;
    try {
      await db.current.collection('users').doc(targetUserId).update({ orgId: null, role: 'viewer' });
      alert("Member removed successfully.");
      fetchMembers(orgId);
    } catch (err) { alert("Error removing member: " + err.message); }
  };
  
  const transferOwnership = async (newOwnerId, newOwnerName) => {
    try {
      const batch = db.current.batch();
      batch.update(db.current.collection('users').doc(user.uid), { role: 'admin' });
      batch.update(db.current.collection('users').doc(newOwnerId), { role: 'owner' });
      await batch.commit();
      alert("Ownership transferred successfully.");
      window.location.reload();
    } catch (err) { alert("Transfer failed: " + err.message); }
  };

  const generateInviteLink = async () => {
    if (!orgId || !inviteEmail) {
      alert("Please enter a recipient email address first.");
      return;
    }
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10);
      await db.current.collection('invitations').doc(inviteCode).set({
        orgId: orgId,
        role: inviteRole,
        churchName: churchName,
        createdAt: new Date().toISOString()
      });
      const link = window.location.origin + '?invite=' + inviteCode;
      setGeneratedInvite(link);

      const templateParams = {
        to_email: inviteEmail,
        church_name: churchName,
        invite_link: link,
        role: inviteRole
      };

      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      alert('Invitation email successfully sent to ' + inviteEmail);
      setInviteEmail('');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleDeleteAccount = async () => {
    const confirmMessage = userRole === 'owner' 
      ? "WARNING: You are the owner. Deleting your account will leave the church schedule without an owner. Proceed?"
      : "Permanently delete your account? This cannot be undone.";
    if (!window.confirm(confirmMessage)) return;
    try {
      const u = auth.current.currentUser;
      await db.current.collection('users').doc(u.uid).delete();
      await u.delete();
      alert('Account deleted.');
      handleLogout();
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') alert('Please sign out and back in before deleting.');
      else alert('Error: ' + err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError('');
    try { await auth.current.signInWithEmailAndPassword(authEmail, authPassword); setAuthEmail(''); setAuthPassword(''); }
    catch (err) { setAuthError(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthError('');
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('invite');
      let targetOrgId = null;
      let targetRole = 'owner';
      let targetChurchName = churchName;

      if (inviteCode) {
        const inviteDoc = await db.current.collection('invitations').doc(inviteCode).get();
        if (inviteDoc.exists) {
          const inviteData = inviteDoc.data();
          targetOrgId = inviteData.orgId;
          targetRole = inviteData.role;
          targetChurchName = inviteData.churchName;
        } else {
          setAuthError('Invalid or expired invitation link.');
          return;
        }
      }

      const r = await auth.current.createUserWithEmailAndPassword(authEmail, authPassword);
      await r.user.updateProfile({ displayName: authName });
      const f = authName.split(' ')[0], l = authName.split(' ').slice(1).join(' ');
      const finalOrgId = targetOrgId || ('org_' + r.user.uid);
      if (!targetOrgId) {
        await db.current.collection('organizations').doc(finalOrgId).set({
          churchName: targetChurchName || 'My Church', speakers: [], schedule: {}, serviceSettings, ownerUid: r.user.uid, createdAt: new Date().toISOString()
        });
      }
      await db.current.collection('users').doc(r.user.uid).set({ email: authEmail, name: authName, firstName: f, lastName: l, orgId: finalOrgId, role: targetRole, createdAt: new Date().toISOString() });
      setOrgId(finalOrgId); setUserRole(targetRole);
      window.history.pushState({}, document.title, "/");
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = async () => { 
    await auth.current.signOut(); setSpeakers([]); setSchedule({}); setChurchName(''); setOrgId(null); setUserRole(null); setShowProfile(false); 
  };

  const getMonthDays = (date) => {
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const d = [];
    for (let i = first.getDay() - 1; i >= 0; i--) d.push({ date: new Date(y, m, -i), isCurrentMonth: false });
    for (let i = 1; i <= last.getDate(); i++) d.push({ date: new Date(y, m, i), isCurrentMonth: true });
    while (d.length < 42) d.push({ date: new Date(y, m + 1, d.length - last.getDate() - (first.getDay() - 1)), isCurrentMonth: false });
    return d;
  };

  const isSpeakerAvailable = (s, d, type) => {
    if (!s.availability[type]) return false;
    const ds = d.toISOString().split('T')[0];
    for (const b of (s.blockOffDates || [])) if (ds >= b.start && ds <= b.end) return false;
    return true;
  };

  const generateSchedule = () => {
    const days = getMonthDays(selectedMonth), newSchedule = { ...schedule };
    const seed = selectedMonth.getFullYear() * 12 + selectedMonth.getMonth();
    const counts = {}; speakers.forEach(s => counts[s.id] = { sundayMorning: 0, sundayEvening: 0, wednesdayEvening: 0, communion: 0 });
    const slots = { sundayMorning: [], sundayEvening: [], wednesdayEvening: [], communion: [] };
    let sc = 0;
    days.forEach(({ date, isCurrentMonth }) => {
      if (!isCurrentMonth) return;
      const dw = date.getDay(), dk = date.toISOString().split('T')[0];
      if (dw === 0) {
        sc++;
        if (serviceSettings.sundayMorning.enabled) slots.sundayMorning.push({ dk, date, week: sc });
        if (serviceSettings.sundayEvening.enabled) slots.sundayEvening.push({ dk, date, week: sc });
        if (serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled) slots.communion.push({ dk, date, week: sc });
      }
      if (dw === 3 && serviceSettings.wednesdayEvening.enabled) slots.wednesdayEvening.push({ dk, date, week: Math.ceil(date.getDate() / 7) });
    });

    const getAvailable = (d, type, exId = null) => {
      let av = speakers.filter(s => isSpeakerAvailable(s, d, type) && s.id !== exId);
      const p1 = av.filter(s => s.priority === 1), p2 = av.filter(s => s.priority === 2), def = av.filter(s => !s.priority);
      const off = type === 'sundayMorning' ? 0 : type === 'sundayEvening' ? 1000 : type === 'wednesdayEvening' ? 2000 : 3000;
      const sort = (a, b) => counts[a.id][type] - counts[b.id][type];
      const sortedDefault = shuffleArray(def, seed + off).sort(sort);
      return [...p1.sort(sort), ...p2.sort(sort), ...sortedDefault];
    };

    const applyRepeat = (type, list) => {
      speakers.forEach(s => {
        (s.repeatRules || []).filter(r => r.serviceType === type).forEach(r => {
          list.forEach(sl => {
            const sk = sl.dk + '-' + type;
            if (!newSchedule[sk] && isSpeakerAvailable(s, sl.date, type)) {
              if ((r.pattern === 'everyOther' && ((r.startWeek === 'odd') ? (sl.week % 2 !== 0) : (sl.week % 2 === 0))) || (r.pattern === 'nthWeek' && sl.week === r.nthWeek)) {
                newSchedule[sk] = { speakerId: s.id, date: sl.dk, serviceType: type }; counts[s.id][type]++;
              }
            }
          });
        });
      });
    };

    ['sundayMorning', 'sundayEvening', 'wednesdayEvening'].forEach(t => applyRepeat(t, slots[t]));
    const fill = (t, list, ex) => list.forEach(sl => {
      const sk = sl.dk + '-' + t;
      if (!newSchedule[sk]) {
        const sel = getAvailable(sl.date, t, ex ? newSchedule[sl.dk + '-' + ex]?.speakerId : null)[0];
        if (sel) { newSchedule[sk] = { speakerId: sel.id, date: sl.dk, serviceType: t }; counts[sel.id][t]++; }
      }
    });
    fill('sundayMorning', slots.sundayMorning); fill('communion', slots.communion, 'sundayMorning'); fill('sundayEvening', slots.sundayEvening); fill('wednesdayEvening', slots.wednesdayEvening);
    setSchedule(newSchedule); setView('calendar');
  };

  const shuffleArray = (array, seed) => {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    while (currentIndex > 0) {
      const randomIndex = Math.floor(seededRandom() * currentIndex);
      currentIndex--;
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    return shuffled;
  };

  const clearMonth = () => {
    const year = selectedMonth.getFullYear(), month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => {
      const dParts = key.split('-');
      const slotDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
      if (slotDate.getFullYear() === year && slotDate.getMonth() === month) delete newSchedule[key];
    });
    setSchedule(newSchedule);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const sundays = getMonthDays(selectedMonth).filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 0);
    const wednesdays = getMonthDays(selectedMonth).filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 3);
    
    let sundaysHTML = '';
    sundays.forEach(({ date }) => {
      const dk = date.toISOString().split('T')[0], sm = schedule[dk + '-sundayMorning'], c = schedule[dk + '-communion'], se = schedule[dk + '-sundayEvening'];
      let sv = '';
      if (serviceSettings.sundayMorning.enabled) sv += '<div style="background:#dbeafe;color:#1e40af;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;"><strong>' + serviceSettings.sundayMorning.time + ':</strong> ' + (sm ? getSpeakerName(sm.speakerId) : '—') + '</div>';
      if (serviceSettings.communion.enabled) sv += '<div style="background:#fce7f3;color:#be185d;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;"><strong>Communion:</strong> ' + (c ? getSpeakerName(c.speakerId) : '—') + '</div>';
      if (serviceSettings.sundayEvening.enabled) sv += '<div style="background:#ede9fe;color:#5b21b6;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;"><strong>' + serviceSettings.sundayEvening.time + ':</strong> ' + (se ? getSpeakerName(se.speakerId) : '—') + '</div>';
      sundaysHTML += '<div style="padding:12px;border-bottom:1px solid #ddd;"><div style="font-weight:bold;">' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</div>' + sv + '</div>';
    });

    let wedsHTML = '';
    wednesdays.forEach(({ date }) => {
      const dk = date.toISOString().split('T')[0], w = schedule[dk + '-wednesdayEvening'];
      wedsHTML += '<div style="padding:12px;border-bottom:1px solid #ddd;"><div style="font-weight:bold;">' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</div><div style="background:#d1fae5;color:#065f46;padding:6px 10px;border-radius:4px;font-size:13px;"><strong>' + serviceSettings.wednesdayEvening.time + ':</strong> ' + (w ? getSpeakerName(w.speakerId) : '—') + '</div></div>';
    });

    printWindow.document.write('<html><head><title>Schedule - ' + monthName + '</title><style>body { font-family: sans-serif; padding: 20px; } h1, h2 { text-align: center; color: #1e3a5f; } .container { display: flex; gap: 24px; } .column { flex: 1; } .column-header { background: #1e3a5f; color: white; padding: 12px; text-align: center; font-weight: bold; }</style></head><body><h1>Teaching Schedule</h1><h2>' + monthName + '</h2><div class="container"><div class="column"><div class="column-header">Sundays</div>' + sundaysHTML + '</div><div class="column"><div class="column-header">Wednesdays</div>' + wedsHTML + '</div></div><script>window.print();</script></body></html>');
    printWindow.document.close();
  };

  const handleDragStart = (sk) => setDraggedSlot(sk);
  const handleDrop = (tk) => {
    if (!draggedSlot || draggedSlot === tk) return;
    const ns = { ...schedule }, d = ns[draggedSlot], t = ns[tk];
    if (d) ns[tk] = { ...d, date: tk.split('-')[0], serviceType: tk.split('-').slice(1).join('-') };
    if (t) ns[draggedSlot] = { ...t, date: draggedSlot.split('-')[0], serviceType: draggedSlot.split('-').slice(1).join('-') };
    else delete ns[draggedSlot];
    setSchedule(ns); setDraggedSlot(null);
  };

  const assignSpeakerToSlot = (sid) => {
    if (!assigningSlot) return;
    setSchedule({ ...schedule, [assigningSlot.slotKey]: { speakerId: sid, date: assigningSlot.date, serviceType: assigningSlot.serviceType } });
    setAssigningSlot(null);
  };

  const getAvailableSpeakersForSlot = (d, t) => speakers.filter(s => isSpeakerAvailable(s, new Date(d + 'T12:00:00'), t));

  const getSpeakerName = (id) => {
    const s = speakers.find(s => s.id === id);
    return s ? (s.firstName + ' ' + s.lastName) : '';
  };

  if (authLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Loading...</div>;

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`* { box-sizing: border-box; } .auth-in { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 12px; }`}</style>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', color: '#1e3a5f' }}>✝ Church Schedule</h2>
        <form onSubmit={authView === 'login' ? handleLogin : handleRegister}>
          {authView === 'register' && <input className="auth-in" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
          {authView === 'register' && (
            <input 
              className="auth-in" 
              placeholder="Church Name" 
              value={churchName} 
              onChange={e => setChurchName(e.target.value)} 
              disabled={churchNameLocked}
              style={{ backgroundColor: churchNameLocked ? '#f3f4f6' : 'white', cursor: churchNameLocked ? 'not-allowed' : 'text' }}
              required 
            />
          )}
          <input className="auth-in" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
          <input className="auth-in" type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{authView === 'login' ? 'Login' : 'Sign Up'}</button>
        </form>
        <button onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ width: '100%', border: 'none', background: 'none', marginTop: '12px', cursor: 'pointer', color: '#1e3a5f' }}>{authView === 'login' ? "Need an account? Sign Up" : "Back to Login"}</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f3', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap');
        .btn-primary { background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; flex-shrink: 0; }
        .btn-secondary { background: white; color: #1e3a5f; border: 2px solid #1e3a5f; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; }
        .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; overflow-x: hidden; }
        .nav-tab { padding: 12px 20px; border: none; background: transparent; font-weight: 600; color: #666; cursor: pointer; border-bottom: 3px solid transparent; }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .service-badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 0 8px 4px 0; display: inline-block; }
        .calendar-bar { padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; margin: 4px 0; cursor: grab; display: block; width: 100%; text-align: left; border: none; }
        .bar-empty { background: #e5e7eb; color: #666; cursor: pointer; }
        .input-field { width: 100%; padding: 12px; border: 2px solid #e5e0d8; border-radius: 8px; font-family: 'Outfit', sans-serif; }
      `}</style>

      <header style={{ background: '#f3f4f6', padding: '24px 0', borderBottom: '1px solid #e5e7eb', color: '#1e3a5f' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'flex-end', gap: '24px', paddingBottom: '4px' }}>
            <img src={logo} alt="CCC App Logo" style={{ height: '80px', width: 'auto', display: 'block', marginBottom: '-4px' }} />
            <div style={{ paddingBottom: '2px' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: '700', color: '#1e3a5f', lineHeight: '1' }}>{churchName || 'Norman Church of Christ'}</h1>
              <p style={{ opacity: 0.7, fontSize: '14px', marginTop: '6px', fontWeight: '500', marginBottom: 0 }}>Manage speakers and generated schedules</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['owner', 'admin'].includes(userRole) && <button className="btn-secondary" onClick={() => setShowSettings(true)}>⚙️ Settings</button>}
            <div style={{ position: 'relative' }} data-profile-menu>
              <button className="btn-secondary" onClick={() => setShowProfile(!showProfile)}>👤 {user.displayName || 'Account'}</button>
              {showProfile && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '220px', overflow: 'hidden', color: '#333', zIndex: 100 }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: '600' }}>{user.displayName || 'User'}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                    <div style={{ fontSize: '11px', color: '#1e3a5f', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '4px' }}>Role: {userRole}</div>
                  </div>
                  <button onClick={() => { setShowEditProfile(true); setShowProfile(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>Edit Profile & Congregation</button>
                  <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px' }}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {transferTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h2 style={{ color: '#1e3a5f', margin: '0 0 12px 0' }}>Transfer Ownership?</h2>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>You are about to make <strong>{transferTarget.displayName}</strong> the Owner of <strong>{churchName}</strong>. You will be demoted to <strong>Admin</strong>.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => { transferOwnership(transferTarget.id, transferTarget.displayName); setTransferTarget(null); }} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Transfer Ownership</button>
                <button onClick={() => setTransferTarget(null)} style={{ background: '#f3f4f6', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', color: '#666' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
        <nav style={{ display: 'flex', background: 'white', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #ddd', overflowX: 'auto' }}>
          <button className={'nav-tab ' + (view === 'speakers' ? 'active' : '')} onClick={() => setView('speakers')}>👤 Speakers</button>
          <button className={'nav-tab ' + (view === 'calendar' ? 'active' : '')} onClick={() => setView('calendar')}>📅 Calendar</button>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto' }}>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>← Prev</button>
            <h2 style={{ color: '#1e3a5f', margin: 0, minWidth: '150px', textAlign: 'center' }}>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn-secondary" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>Next →</button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {view === 'calendar' && ['owner', 'admin'].includes(userRole) && <button className="btn-secondary" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={clearMonth}>🗑️ Clear Month</button>}
            {view === 'calendar' && <button className="btn-secondary" onClick={exportToPDF}>📄 Export PDF</button>}
            {['owner', 'admin'].includes(userRole) && <button className="btn-primary" onClick={generateSchedule}>⚡ Generate Schedule</button>}
          </div>
        </div>

        {view === 'speakers' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#1e3a5f', margin: 0 }}>Manage Speakers ({speakers.length})</h2>
              {['owner', 'admin'].includes(userRole) && <button className="btn-primary" onClick={() => { setEditingSpeaker({ id: Date.now(), firstName: '', lastName: '', availability: {}, blockOffDates: [], repeatRules: [] }); setShowAddSpeaker(true); }}>+ Add Speaker</button>}
            </div>
            {speakers.map(s => (
              <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#1e3a5f' }}>{s.firstName} {s.lastName}</h3>
                  <div style={{ marginBottom: '8px' }}>
                    {s.availability.sundayMorning && <span className="service-badge badge-morning">Sunday Morning</span>}
                    {s.availability.sundayEvening && <span className="service-badge badge-evening">Sunday Evening</span>}
                    {s.availability.wednesdayEvening && <span className="service-badge badge-wednesday">Wednesday Evening</span>}
                    {s.availability.communion && <span className="service-badge badge-communion">Communion</span>}
                  </div>
                </div>
                {['owner', 'admin'].includes(userRole) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => { setEditingSpeaker({...s}); setShowAddSpeaker(true); }}>Edit</button>
                    <button style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }} onClick={() => setSpeakers(speakers.filter(sp => sp.id !== s.id))}>Remove</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', borderRight: '1px solid #eee' }}>
              <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold' }}>Sundays</div>
              {getMonthDays(selectedMonth).filter(d => d.isCurrentMonth && d.date.getDay() === 0).map(d => {
                const k = d.date.toISOString().split('T')[0];
                const sm = schedule[k + '-sundayMorning'], c = schedule[k + '-communion'], se = schedule[k + '-sundayEvening'];
                return (
                  <div key={k} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{d.date.getDate()}</div>
                    {serviceSettings.sundayMorning.enabled && <button className={'calendar-bar ' + (sm ? 'badge-morning' : 'bar-empty')} onClick={() => ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-sundayMorning', date: k, serviceType: 'sundayMorning' })}>{serviceSettings.sundayMorning.label}: {sm ? getSpeakerName(sm.speakerId) : '+ Assign'}</button>}
                    {serviceSettings.communion.enabled && <button className={'calendar-bar ' + (c ? 'badge-communion' : 'bar-empty')} onClick={() => ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-communion', date: k, serviceType: 'communion' })}>Communion: {c ? getSpeakerName(c.speakerId) : '+ Assign'}</button>}
                    {serviceSettings.sundayEvening.enabled && <button className={'calendar-bar ' + (se ? 'badge-evening' : 'bar-empty')} onClick={() => ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-sundayEvening', date: k, serviceType: 'sundayEvening' })}>{serviceSettings.sundayEvening.label}: {se ? getSpeakerName(se.speakerId) : '+ Assign'}</button>}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ padding: '16px', textAlign: 'center', background: '#f8f6f3', fontWeight: 'bold' }}>Wednesdays</div>
              {getMonthDays(selectedMonth).filter(d => d.isCurrentMonth && d.date.getDay() === 3).map(d => {
                const k = d.date.toISOString().split('T')[0], w = schedule[k + '-wednesdayEvening'];
                return (
                  <div key={k} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{d.date.getDate()}</div>
                    <button className={'calendar-bar ' + (w ? 'badge-wednesday' : 'bar-empty')} onClick={() => ['owner', 'admin', 'standard'].includes(userRole) && setAssigningSlot({ slotKey: k + '-wednesdayEvening', date: k, serviceType: 'wednesdayEvening' })}>{serviceSettings.wednesdayEvening.label}: {w ? getSpeakerName(w.speakerId) : '+ Assign'}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>⚙️ Service Settings</h3>
            {Object.keys(serviceSettings).map(k => (
              <div key={k} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', gap: '10px', fontWeight: 'bold', marginBottom: '8px' }}>
                  <input type="checkbox" checked={serviceSettings[k].enabled} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], enabled: e.target.checked } })} /> {serviceSettings[k].label}
                </label>
                {serviceSettings[k].enabled && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input className="input-field" style={{flex: '1 1 200px'}} value={serviceSettings[k].label} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], label: e.target.value } })} />
                    {k !== 'communion' && <input className="input-field" style={{flex: '1 1 100px'}} value={serviceSettings[k].time} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], time: e.target.value } })} />}
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ marginTop: '32px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
              <h4 style={{ color: '#1e3a5f', marginBottom: '16px' }}>👥 Organization Members</h4>
              {userRole === 'owner' && (
                <div style={{ background: '#f8f6f3', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Invite a New Member</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input className="input-field" placeholder="Recipient email" style={{ flex: '2 1 200px' }} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                    <select className="input-field" style={{ flex: '1 1 120px' }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                      <option value="viewer">Viewer</option><option value="standard">Standard</option><option value="admin">Admin</option>
                    </select>
                    <button className="btn-primary" onClick={generateInviteLink} style={{ flex: '1 1 100px', fontSize: '13px' }}>Send Invite</button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {members.map((member) => (
                  <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{member.displayName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{member.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {(userRole === 'owner' || (userRole === 'admin' && member.role !== 'owner')) && member.id !== user.uid ? (
                        <select value={member.role} onChange={(e) => updateMemberRole(member.id, e.target.value)} style={{ padding: '4px', fontSize: '12px' }}>
                          <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option>
                        </select>
                      ) : ( <span className="badge">{member.role}</span> )}
                      {((userRole === 'owner' && member.role !== 'owner') || (userRole === 'admin' && !['owner', 'admin'].includes(member.role))) && (
                        <button onClick={() => removeMember(member.id, member.displayName)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                      )}
                      {userRole === 'owner' && member.id !== user.uid && <button onClick={() => setTransferTarget(member)} className="btn-secondary" style={{ fontSize: '10px' }}>Transfer</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => setShowSettings(false)}>Close Settings</button>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Edit Profile</h3>
            <form onSubmit={handleUpdateProfile}>
              <input className="input-field" style={{ marginBottom: '12px' }} value={churchName} onChange={e => setChurchName(e.target.value)} disabled={userRole !== 'owner'} />
              <input className="input-field" style={{ marginBottom: '12px' }} placeholder="First Name" value={userFirstName} onChange={e => setUserFirstName(e.target.value)} required />
              <input className="input-field" style={{ marginBottom: '12px' }} placeholder="Last Name" value={userLastName} onChange={e => setUserLastName(e.target.value)} required />
              <input className="input-field" style={{ marginBottom: '24px' }} placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEditProfile(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddSpeaker && editingSpeaker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
            <h3>{speakers.find(s => s.id === editingSpeaker.id) ? 'Edit' : 'Add'} Speaker</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input className="input-field" placeholder="First" value={editingSpeaker.firstName} onChange={e => setEditingSpeaker({ ...editingSpeaker, firstName: e.target.value })} />
              <input className="input-field" placeholder="Last" value={editingSpeaker.lastName} onChange={e => setEditingSpeaker({ ...editingSpeaker, lastName: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowAddSpeaker(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => { if (speakers.find(s => s.id === editingSpeaker.id)) setSpeakers(speakers.map(s => s.id === editingSpeaker.id ? editingSpeaker : s)); else setSpeakers([...speakers, editingSpeaker]); setShowAddSpeaker(false); }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {assigningSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3>Assign Speaker</h3>
            {getAvailableSpeakersForSlot(assigningSlot.date, assigningSlot.serviceType).map(s => (
              <button key={s.id} className="btn-secondary" style={{ width: '100%', marginBottom: '8px', textAlign: 'left' }} onClick={() => assignSpeakerToSlot(s.id)}>{s.firstName} {s.lastName}</button>
            ))}
            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setAssigningSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
