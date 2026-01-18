import React, { useState, useEffect, useRef } from 'react';

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1uwoEbX9BSnmbXPBQFOdzJGSdvxv22MM",
  authDomain: "teaching-schedule-generator.firebaseapp.com",
  projectId: "teaching-schedule-generator",
  storageBucket: "teaching-schedule-generator.firebasestorage.app",
  messagingSenderId: "154699704030",
  appId: "1:154699704030:web:eba731b832f79a8170444f"
};

// Firebase SDK URLs
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';

// Main App Component
export default function ChurchScheduleApp() {
  // Auth state
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot'
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  
  const firebaseApp = useRef(null);
  const db = useRef(null);
  const auth = useRef(null);

  // App state
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
    wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:00 PM' },
    communion: { enabled: true, label: 'Communion', time: '' }
  });

  // Load Firebase SDK
  useEffect(() => {
    const loadFirebase = async () => {
      try {
        // Check if Firebase is already loaded
        if (window.firebase) {
          initializeFirebase();
          return;
        }

        // Load Firebase scripts
        const loadScript = (url) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        };

        await loadScript(FIREBASE_APP_URL);
        await loadScript(FIREBASE_AUTH_URL);
        await loadScript(FIREBASE_FIRESTORE_URL);
        
        initializeFirebase();
      } catch (error) {
        console.error('Failed to load Firebase:', error);
        setAuthLoading(false);
      }
    };

    const initializeFirebase = () => {
      if (!window.firebase.apps.length) {
        firebaseApp.current = window.firebase.initializeApp(FIREBASE_CONFIG);
      } else {
        firebaseApp.current = window.firebase.apps[0];
      }
      
      auth.current = window.firebase.auth();
      db.current = window.firebase.firestore();
      
      // Listen for auth state changes
      auth.current.onAuthStateChanged((user) => {
        setUser(user);
        setAuthLoading(false);
        if (user) {
          loadUserData(user.uid);
        }
      });
      
      setFirebaseReady(true);
    };

    loadFirebase();
  }, []);

  // Load user data from Firestore
  const loadUserData = async (userId) => {
    if (!db.current) return;
    
    setDataLoading(true);
    try {
      const userDoc = await db.current.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data.speakers) setSpeakers(data.speakers);
        if (data.schedule) setSchedule(data.schedule);
        if (data.serviceSettings) setServiceSettings(data.serviceSettings);
        if (data.churchName) setChurchName(data.churchName);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    setDataLoading(false);
  };

  // Save user data to Firestore
  const saveUserData = async () => {
    if (!db.current || !user) return;
    
    try {
      await db.current.collection('users').doc(user.uid).set({
        speakers,
        schedule,
        serviceSettings,
        churchName,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  // Auto-save when data changes
  useEffect(() => {
    if (user && firebaseReady && !dataLoading) {
      const timeoutId = setTimeout(() => {
        saveUserData();
      }, 1000); // Debounce saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [speakers, schedule, serviceSettings, churchName, user, firebaseReady]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfile && !e.target.closest('[data-profile-menu]')) {
        setShowProfile(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfile]);

  // Auth functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      await auth.current.signInWithEmailAndPassword(authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    
    try {
      const result = await auth.current.createUserWithEmailAndPassword(authEmail, authPassword);
      
      // Update profile with name
      await result.user.updateProfile({ displayName: authName });
      
      // Create initial user document
      await db.current.collection('users').doc(result.user.uid).set({
        email: authEmail,
        name: authName,
        churchName: churchName || 'My Church',
        speakers: [],
        schedule: {},
        serviceSettings: {
          sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
          sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
          wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:00 PM' },
          communion: { enabled: true, label: 'Communion', time: '' }
        },
        createdAt: new Date().toISOString()
      });
      
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setChurchName('');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      await auth.current.sendPasswordResetEmail(authEmail);
      setAuthError('Password reset email sent! Check your inbox.');
      setAuthView('login');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    }
  };

  const handleLogout = async () => {
    try {
      await auth.current.signOut();
      setSpeakers([]);
      setSchedule({});
      setServiceSettings({
        sundayMorning: { enabled: true, label: 'Sunday Morning', time: '10:00 AM' },
        sundayEvening: { enabled: true, label: 'Sunday Evening', time: '6:00 PM' },
        wednesdayEvening: { enabled: true, label: 'Wednesday Evening', time: '7:00 PM' },
        communion: { enabled: true, label: 'Communion', time: '' }
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getAuthErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered';
      case 'auth/invalid-email': return 'Invalid email address';
      case 'auth/operation-not-allowed': return 'Email/password accounts are not enabled';
      case 'auth/weak-password': return 'Password is too weak';
      case 'auth/user-disabled': return 'This account has been disabled';
      case 'auth/user-not-found': return 'No account found with this email';
      case 'auth/wrong-password': return 'Incorrect password';
      case 'auth/invalid-credential': return 'Invalid email or password';
      default: return 'An error occurred. Please try again.';
    }
  };

  // Generate calendar days for the selected month
  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add padding days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Add padding days for next month
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  // Check if a speaker is available on a given date and service type
  const isSpeakerAvailable = (speaker, date, serviceType) => {
    // Check if service type is enabled for this speaker
    if (!speaker.availability[serviceType]) return false;
    
    // Check block-off dates
    const dateStr = date.toISOString().split('T')[0];
    for (const block of speaker.blockOffDates || []) {
      if (dateStr >= block.start && dateStr <= block.end) {
        return false;
      }
    }
    return true;
  };

  // Shuffle array using Fisher-Yates algorithm with seed based on month/year
  const shuffleArray = (array, seed) => {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    
    // Simple seeded random number generator
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    while (currentIndex > 0) {
      const randomIndex = Math.floor(seededRandom() * currentIndex);
      currentIndex--;
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    
    return shuffled;
  };

  // Generate schedule for the month
  const generateSchedule = () => {
    const days = getMonthDays(selectedMonth);
    const newSchedule = {};
    
    // Create a unique seed based on month and year for consistent but unique shuffling
    const seed = selectedMonth.getFullYear() * 12 + selectedMonth.getMonth();
    
    // Track how many times each speaker has been assigned per service type
    const speakerCounts = {};
    speakers.forEach(s => {
      speakerCounts[s.id] = { 
        sundayMorning: 0, 
        sundayEvening: 0, 
        wednesdayEvening: 0,
        communion: 0,
        total: 0 
      };
    });
    
    // Get all service slots for the month organized by service type
    const slots = {
      sundayMorning: [],
      sundayEvening: [],
      wednesdayEvening: [],
      communion: []
    };
    
    // Track which week of the month each Sunday falls on (1-5)
    let sundayCount = 0;
    
    days.forEach(({ date, isCurrentMonth }) => {
      if (!isCurrentMonth) return;
      
      const dayOfWeek = date.getDay();
      const dateKey = date.toISOString().split('T')[0];
      
      if (dayOfWeek === 0) { // Sunday
        sundayCount++;
        if (serviceSettings.sundayMorning.enabled) {
          slots.sundayMorning.push({ dateKey, date, weekOfMonth: sundayCount });
        }
        if (serviceSettings.sundayEvening.enabled) {
          slots.sundayEvening.push({ dateKey, date, weekOfMonth: sundayCount });
        }
        if (serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled) {
          slots.communion.push({ dateKey, date, weekOfMonth: sundayCount });
        }
      }
      
      if (dayOfWeek === 3) { // Wednesday
        if (serviceSettings.wednesdayEvening.enabled) {
          slots.wednesdayEvening.push({ dateKey, date, weekOfMonth: Math.ceil(date.getDate() / 7) });
        }
      }
    });
    
    // Sort speakers by priority for selection
    const getSortedAvailableSpeakers = (date, serviceType, excludeSpeakerId = null) => {
      let available = speakers
        .filter(s => isSpeakerAvailable(s, date, serviceType))
        .filter(s => excludeSpeakerId ? s.id !== excludeSpeakerId : true);
      
      // Separate by priority
      const priority1 = available.filter(s => s.priority === 1);
      const priority2 = available.filter(s => s.priority === 2);
      const defaultPriority = available.filter(s => !s.priority || s.priority === 0);
      
      // Shuffle default priority speakers for rotation (using month seed + serviceType for variety)
      const serviceOffset = serviceType === 'sundayMorning' ? 0 : serviceType === 'sundayEvening' ? 1000 : serviceType === 'wednesdayEvening' ? 2000 : 3000;
      const shuffledDefault = shuffleArray(defaultPriority, seed + serviceOffset);
      
      // Sort each group by count (fewest assignments first)
      const sortByCount = (a, b) => speakerCounts[a.id][serviceType] - speakerCounts[b.id][serviceType];
      priority1.sort(sortByCount);
      priority2.sort(sortByCount);
      shuffledDefault.sort(sortByCount);
      
      // Combine: priority 1 first, then priority 2, then shuffled default
      return [...priority1, ...priority2, ...shuffledDefault];
    };
    
    // First pass: Assign speakers with repeat rules
    const assignRepeatRuleSpeakers = (serviceType, slotList) => {
      speakers.forEach(speaker => {
        if (!speaker.repeatRules) return;
        
        const rules = speaker.repeatRules.filter(r => r.serviceType === serviceType);
        
        rules.forEach(rule => {
          slotList.forEach((slot, index) => {
            // Check if speaker is available for this slot
            if (!isSpeakerAvailable(speaker, slot.date, serviceType)) return;
            
            // Check if slot is already assigned
            const slotKey = `${slot.dateKey}-${serviceType}`;
            if (newSchedule[slotKey]) return;
            
            let shouldAssign = false;
            
            if (rule.pattern === 'everyOther') {
              const startOnOdd = rule.startWeek === 'odd';
              const isOddWeek = slot.weekOfMonth % 2 === 1;
              shouldAssign = startOnOdd ? isOddWeek : !isOddWeek;
            } else if (rule.pattern === 'nthWeek') {
              shouldAssign = slot.weekOfMonth === rule.nthWeek;
            }
            
            if (shouldAssign) {
              newSchedule[slotKey] = {
                speakerId: speaker.id,
                date: slot.dateKey,
                serviceType
              };
              speakerCounts[speaker.id][serviceType]++;
              speakerCounts[speaker.id].total++;
            }
          });
        });
      });
    };
    
    // Apply repeat rules first (not for communion)
    assignRepeatRuleSpeakers('sundayMorning', slots.sundayMorning);
    assignRepeatRuleSpeakers('sundayEvening', slots.sundayEvening);
    assignRepeatRuleSpeakers('wednesdayEvening', slots.wednesdayEvening);
    
    // Second pass: Fill remaining slots with priority and rotation
    const fillRemainingSlots = (serviceType, slotList, excludeFromSlotKey = null) => {
      slotList.forEach(slot => {
        const slotKey = `${slot.dateKey}-${serviceType}`;
        
        // Skip if already assigned by repeat rules
        if (newSchedule[slotKey]) return;
        
        // Get excluded speaker ID (for communion, exclude Sunday morning speaker)
        let excludeSpeakerId = null;
        if (excludeFromSlotKey) {
          const excludeKey = `${slot.dateKey}-${excludeFromSlotKey}`;
          excludeSpeakerId = newSchedule[excludeKey]?.speakerId;
        }
        
        // Get available speakers sorted by priority and count
        const availableSpeakers = getSortedAvailableSpeakers(slot.date, serviceType, excludeSpeakerId);
        
        if (availableSpeakers.length === 0) return;
        
        // Select the best speaker (first in the sorted list)
        const selectedSpeaker = availableSpeakers[0];
        newSchedule[slotKey] = {
          speakerId: selectedSpeaker.id,
          date: slot.dateKey,
          serviceType
        };
        speakerCounts[selectedSpeaker.id][serviceType]++;
        speakerCounts[selectedSpeaker.id].total++;
      });
    };
    
    // Fill Sunday morning first
    fillRemainingSlots('sundayMorning', slots.sundayMorning);
    
    // Fill communion (excluding Sunday morning speaker)
    fillRemainingSlots('communion', slots.communion, 'sundayMorning');
    
    // Fill other services
    fillRemainingSlots('sundayEvening', slots.sundayEvening);
    fillRemainingSlots('wednesdayEvening', slots.wednesdayEvening);
    
    setSchedule(newSchedule);
    setView('calendar');
  };

  // Remove speaker from a slot
  const removeFromSlot = (slotKey) => {
    const newSchedule = { ...schedule };
    delete newSchedule[slotKey];
    setSchedule(newSchedule);
  };

  // Clear all assignments for the current month
  const clearMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const newSchedule = { ...schedule };
    
    // Remove all slots that belong to the current month
    Object.keys(newSchedule).forEach(key => {
      const slotDate = new Date(key.split('-').slice(0, 3).join('-'));
      if (slotDate.getFullYear() === year && slotDate.getMonth() === month) {
        delete newSchedule[key];
      }
    });
    
    setSchedule(newSchedule);
  };

  // Manually assign a speaker to a slot
  const assignSpeakerToSlot = (speakerId) => {
    if (!assigningSlot) return;
    
    const newSchedule = { ...schedule };
    newSchedule[assigningSlot.slotKey] = {
      speakerId,
      date: assigningSlot.date,
      serviceType: assigningSlot.serviceType
    };
    setSchedule(newSchedule);
    setAssigningSlot(null);
  };

  // Get available speakers for a slot (respecting availability and block-off dates)
  const getAvailableSpeakersForSlot = (date, serviceType) => {
    const dateObj = new Date(date + 'T12:00:00');
    return speakers.filter(s => isSpeakerAvailable(s, dateObj, serviceType));
  };

  // Handle drag and drop
  const handleDragStart = (slotKey) => {
    setDraggedSlot(slotKey);
  };

  const handleDrop = (targetSlotKey) => {
    if (!draggedSlot || draggedSlot === targetSlotKey) {
      setDraggedSlot(null);
      return;
    }
    
    const newSchedule = { ...schedule };
    const draggedData = newSchedule[draggedSlot];
    const targetData = newSchedule[targetSlotKey];
    
    if (draggedData) {
      newSchedule[targetSlotKey] = { ...draggedData, date: targetSlotKey.split('-')[0], serviceType: targetSlotKey.split('-').slice(1).join('-') };
    }
    if (targetData) {
      newSchedule[draggedSlot] = { ...targetData, date: draggedSlot.split('-')[0], serviceType: draggedSlot.split('-').slice(1).join('-') };
    } else {
      delete newSchedule[draggedSlot];
    }
    
    setSchedule(newSchedule);
    setDraggedSlot(null);
  };

  // Get speaker name by ID
  const getSpeakerName = (id) => {
    const speaker = speakers.find(s => s.id === id);
    return speaker ? `${speaker.firstName} ${speaker.lastName}` : '';
  };

  // Export to PDF
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const days = getMonthDays(selectedMonth);
    const sundays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 0);
    const wednesdays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 3);
    
    let sundaysHTML = '';
    sundays.forEach(({ date }) => {
      const dateKey = date.toISOString().split('T')[0];
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sundayMorning = schedule[`${dateKey}-sundayMorning`];
      const communion = schedule[`${dateKey}-communion`];
      const sundayEvening = schedule[`${dateKey}-sundayEvening`];
      
      let services = '';
      if (serviceSettings.sundayMorning.enabled) {
        services += `<div style="background:#3b82f6;color:white;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;">
          <strong>${serviceSettings.sundayMorning.time}:</strong> ${sundayMorning ? getSpeakerName(sundayMorning.speakerId) : '—'}
        </div>`;
      }
      if (serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled) {
        services += `<div style="background:#ec4899;color:white;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;">
          <strong>${serviceSettings.communion.label}:</strong> ${communion ? getSpeakerName(communion.speakerId) : '—'}
        </div>`;
      }
      if (serviceSettings.sundayEvening.enabled) {
        services += `<div style="background:#8b5cf6;color:white;padding:6px 10px;border-radius:4px;font-size:13px;margin:4px 0;">
          <strong>${serviceSettings.sundayEvening.time}:</strong> ${sundayEvening ? getSpeakerName(sundayEvening.speakerId) : '—'}
        </div>`;
      }
      
      sundaysHTML += `<div style="padding:12px;border-bottom:1px solid #ddd;">
        <div style="font-weight:bold;margin-bottom:8px;">${formattedDate}</div>
        ${services}
      </div>`;
    });
    
    let wednesdaysHTML = '';
    wednesdays.forEach(({ date }) => {
      const dateKey = date.toISOString().split('T')[0];
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const wednesdayEvening = schedule[`${dateKey}-wednesdayEvening`];
      
      wednesdaysHTML += `<div style="padding:12px;border-bottom:1px solid #ddd;">
        <div style="font-weight:bold;margin-bottom:8px;">${formattedDate}</div>
        <div style="background:#10b981;color:white;padding:6px 10px;border-radius:4px;font-size:13px;">
          <strong>${serviceSettings.wednesdayEvening.time}:</strong> ${wednesdayEvening ? getSpeakerName(wednesdayEvening.speakerId) : '—'}
        </div>
      </div>`;
    });
    
    const hasSundays = serviceSettings.sundayMorning.enabled || serviceSettings.sundayEvening.enabled;
    const hasWednesdays = serviceSettings.wednesdayEvening.enabled;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Teaching Schedule - ${monthName}</title>
        <style>
          body { font-family: Georgia, serif; padding: 20px; }
          h1 { text-align: center; color: #1e3a5f; margin-bottom: 10px; }
          h2 { text-align: center; color: #666; font-weight: normal; margin-bottom: 30px; }
          .container { display: flex; gap: 24px; }
          .column { flex: 1; }
          .column-header { background: #1e3a5f; color: white; padding: 12px; text-align: center; font-weight: bold; }
          .legend { display: flex; gap: 20px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
          .legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
          .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Teaching Schedule</h1>
        <h2>${monthName}</h2>
        <div class="container">
          ${hasSundays ? `<div class="column">
            <div class="column-header">Sundays</div>
            ${sundaysHTML}
          </div>` : ''}
          ${hasWednesdays ? `<div class="column">
            <div class="column-header">Wednesdays</div>
            ${wednesdaysHTML}
          </div>` : ''}
        </div>
        <div class="legend">
          ${serviceSettings.sundayMorning.enabled ? `<div class="legend-item"><div class="legend-dot" style="background:#3b82f6;"></div> ${serviceSettings.sundayMorning.label} (${serviceSettings.sundayMorning.time})</div>` : ''}
          ${serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled ? `<div class="legend-item"><div class="legend-dot" style="background:#ec4899;"></div> ${serviceSettings.communion.label}</div>` : ''}
          ${serviceSettings.sundayEvening.enabled ? `<div class="legend-item"><div class="legend-dot" style="background:#8b5cf6;"></div> ${serviceSettings.sundayEvening.label} (${serviceSettings.sundayEvening.time})</div>` : ''}
          ${serviceSettings.wednesdayEvening.enabled ? `<div class="legend-item"><div class="legend-dot" style="background:#10b981;"></div> ${serviceSettings.wednesdayEvening.label} (${serviceSettings.wednesdayEvening.time})</div>` : ''}
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Loading screen
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f6f3 0%, #ebe7e0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap');`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✝</div>
          <div style={{ color: '#1e3a5f', fontSize: '18px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Auth screens
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Crimson Pro', Georgia, serif"
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=Outfit:wght@400;500;600&display=swap');
          * { box-sizing: border-box; }
          .auth-input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e0d8;
            border-radius: 10px;
            font-family: 'Outfit', sans-serif;
            font-size: 15px;
            transition: border-color 0.2s ease;
            background: white;
          }
          .auth-input:focus { outline: none; border-color: #1e3a5f; }
          .auth-btn {
            width: 100%;
            padding: 14px 24px;
            background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-family: 'Outfit', sans-serif;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3); }
        `}</style>
        
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '48px 40px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>✝</div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#1e3a5f', 
              margin: '0 0 8px 0' 
            }}>
              Church Teaching Schedule
            </h1>
            <p style={{ 
              color: '#666', 
              margin: 0, 
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px'
            }}>
              {authView === 'login' && 'Sign in to manage your schedule'}
              {authView === 'register' && 'Create your account'}
              {authView === 'forgot' && 'Reset your password'}
            </p>
          </div>

          {authError && (
            <div style={{
              background: authError.includes('sent') ? '#d1fae5' : '#fee2e2',
              color: authError.includes('sent') ? '#065f46' : '#991b1b',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px',
              fontFamily: "'Outfit', sans-serif"
            }}>
              {authError}
            </div>
          )}

          {authView === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  className="auth-input"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@church.org"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  className="auth-input"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <button type="submit" className="auth-btn">
                Sign In
              </button>
              
              <div style={{ 
                textAlign: 'center', 
                marginTop: '20px',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '14px'
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthView('forgot'); setAuthError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e3a5f',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot password?
                </button>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e0d8',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '14px',
                color: '#666'
              }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthView('register'); setAuthError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e3a5f',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Sign Up
                </button>
              </div>
            </form>
          )}

          {authView === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Your Name
                </label>
                <input
                  type="text"
                  className="auth-input"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Church Name
                </label>
                <input
                  type="text"
                  className="auth-input"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="First Baptist Church"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  className="auth-input"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@church.org"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  className="auth-input"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
              
              <button type="submit" className="auth-btn">
                Create Account
              </button>
              
              <div style={{ 
                textAlign: 'center', 
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e0d8',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '14px',
                color: '#666'
              }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthView('login'); setAuthError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e3a5f',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {authView === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  className="auth-input"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@church.org"
                  required
                />
              </div>
              
              <button type="submit" className="auth-btn">
                Send Reset Link
              </button>
              
              <div style={{ 
                textAlign: 'center', 
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e0d8',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '14px',
                color: '#666'
              }}>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthView('login'); setAuthError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e3a5f',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Main app (user is logged in)
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f6f3 0%, #ebe7e0 100%)',
      fontFamily: "'Crimson Pro', Georgia, serif"
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=Outfit:wght@400;500;600&display=swap');
        
        * { box-sizing: border-box; }
        
        .btn-primary {
          background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(30, 58, 95, 0.2);
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3); }
        
        .btn-secondary {
          background: white;
          color: #1e3a5f;
          border: 2px solid #1e3a5f;
          padding: 10px 22px;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover { background: #1e3a5f; color: white; }
        
        .card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          padding: 24px;
        }
        
        .input-field {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e0d8;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          transition: border-color 0.2s ease;
        }
        .input-field:focus { outline: none; border-color: #1e3a5f; }
        
        .checkbox-custom {
          width: 20px;
          height: 20px;
          accent-color: #1e3a5f;
          cursor: pointer;
        }
        
        .service-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          cursor: grab;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .service-badge:hover { transform: scale(1.02); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .service-badge:active { cursor: grabbing; }
        
        .nav-tab {
          padding: 12px 24px;
          border: none;
          background: transparent;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          font-size: 15px;
          color: #666;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }
        .nav-tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
        .nav-tab:hover:not(.active) { color: #1e3a5f; }
        
        .auth-input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e5e0d8;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          transition: border-color 0.2s ease;
          background: white;
        }
        .auth-input:focus { outline: none; border-color: #1e3a5f; }
        
        .auth-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        
        .calendar-day {
          min-height: 120px;
          border: 1px solid #e5e0d8;
          padding: 8px;
          background: white;
          transition: background 0.2s ease;
        }
        .calendar-day.drop-target { background: #f0f7ff; }
        .calendar-day.other-month { background: #fafaf8; }
        
        .fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '32px 0',
        marginBottom: '32px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: '600',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              ✝ {churchName || 'Church Teaching Schedule'}
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              margin: '8px 0 0 0',
              fontFamily: "'Outfit', sans-serif"
            }}>
              Manage speakers and generate monthly teaching schedules
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ⚙️ Settings
            </button>
            <div style={{ position: 'relative' }} data-profile-menu>
              <button
                onClick={() => setShowProfile(!showProfile)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                👤 {user?.displayName || user?.email?.split('@')[0] || 'Account'}
              </button>
              {showProfile && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  minWidth: '220px',
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #e5e0d8' }}>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '600', color: '#1e3a5f' }}>
                      {user?.displayName || 'User'}
                    </div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666', marginTop: '4px' }}>
                      {user?.email}
                    </div>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <button
                      onClick={() => {
                        const newName = prompt('Enter church name:', churchName);
                        if (newName) setChurchName(newName);
                        setShowProfile(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '14px',
                        color: '#333',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                      onMouseOut={(e) => e.target.style.background = 'none'}
                    >
                      ✏️ Edit Church Name
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowProfile(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '14px',
                        color: '#dc2626',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#fef2f2'}
                      onMouseOut={(e) => e.target.style.background = 'none'}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 48px' }}>
        {/* Data Loading Indicator */}
        {dataLoading && (
          <div style={{
            background: '#dbeafe',
            color: '#1e40af',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
            Loading your data...
          </div>
        )}

        {/* Navigation */}
        <nav style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e0d8',
          background: 'white',
          borderRadius: '12px 12px 0 0',
          padding: '0 8px'
        }}>
          <button
            className={`nav-tab ${view === 'speakers' ? 'active' : ''}`}
            onClick={() => setView('speakers')}
          >
            👤 Speakers
          </button>
          <button
            className={`nav-tab ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => setView('calendar')}
          >
            📅 Calendar
          </button>
        </nav>

        {/* Month Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="btn-secondary"
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
              style={{ padding: '10px 16px' }}
            >
              ← Prev
            </button>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#1e3a5f',
              margin: 0,
              minWidth: '220px',
              textAlign: 'center'
            }}>
              {monthName}
            </h2>
            <button
              className="btn-secondary"
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
              style={{ padding: '10px 16px' }}
            >
              Next →
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {view === 'calendar' && Object.keys(schedule).some(key => {
              const slotDate = new Date(key.split('-').slice(0, 3).join('-'));
              return slotDate.getFullYear() === selectedMonth.getFullYear() && slotDate.getMonth() === selectedMonth.getMonth();
            }) && (
              <>
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    if (window.confirm(`Clear all assignments for ${monthName}?`)) {
                      clearMonth();
                    }
                  }}
                  style={{ color: '#991b1b', borderColor: '#991b1b' }}
                >
                  🗑️ Clear Month
                </button>
                <button className="btn-secondary" onClick={exportToPDF}>
                  📄 Export PDF
                </button>
              </>
            )}
            <button
              className="btn-primary"
              onClick={generateSchedule}
              disabled={speakers.length === 0}
              style={{ opacity: speakers.length === 0 ? 0.5 : 1 }}
            >
              ⚡ Generate Schedule
            </button>
          </div>
        </div>

        {/* Speakers View */}
        {view === 'speakers' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1e3a5f',
                margin: 0,
                fontFamily: "'Outfit', sans-serif"
              }}>
                Manage Speakers ({speakers.length})
              </h3>
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingSpeaker({
                    id: Date.now(),
                    firstName: '',
                    lastName: '',
                    availability: { sundayMorning: false, sundayEvening: false, wednesdayEvening: false, communion: false },
                    blockOffDates: [],
                    repeatRules: [], // { serviceType, pattern: 'everyOther' | 'nthWeek', nthWeek: 1-5 }
                    priority: 0 // 0 = default/rotate, 1 = highest, 2 = high
                  });
                  setShowAddSpeaker(true);
                }}
              >
                + Add Speaker
              </button>
            </div>

            {/* Speaker List */}
            {speakers.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h4 style={{ fontFamily: "'Outfit', sans-serif", color: '#1e3a5f', margin: '0 0 8px 0' }}>
                  No Speakers Yet
                </h4>
                <p style={{ color: '#666', margin: 0 }}>
                  Add speakers to start building your teaching schedule
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {speakers.map(speaker => (
                  <div key={speaker.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h4 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#1e3a5f',
                        margin: '0 0 12px 0'
                      }}>
                        {speaker.firstName} {speaker.lastName}
                      </h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {speaker.priority === 1 && (
                          <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                            ★ Priority 1
                          </span>
                        )}
                        {speaker.priority === 2 && (
                          <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                            ★ Priority 2
                          </span>
                        )}
                        {speaker.availability.sundayMorning && (
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>
                            Sunday Morning
                          </span>
                        )}
                        {speaker.availability.sundayEvening && (
                          <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>
                            Sunday Evening
                          </span>
                        )}
                        {speaker.availability.wednesdayEvening && (
                          <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>
                            Wednesday Evening
                          </span>
                        )}
                        {speaker.availability.communion && (
                          <span style={{ background: '#fce7f3', color: '#be185d', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }}>
                            Communion
                          </span>
                        )}
                      </div>
                      {speaker.blockOffDates.length > 0 && (
                        <div style={{ fontSize: '13px', color: '#666', fontFamily: "'Outfit', sans-serif" }}>
                          <strong>Block-off dates:</strong>{' '}
                          {speaker.blockOffDates.map((b, i) => (
                            <span key={i} style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', marginRight: '4px' }}>
                              {b.start} to {b.end}
                            </span>
                          ))}
                        </div>
                      )}
                      {speaker.repeatRules && speaker.repeatRules.length > 0 && (
                        <div style={{ fontSize: '13px', color: '#666', fontFamily: "'Outfit', sans-serif", marginTop: '8px' }}>
                          <strong>Repeat rules:</strong>{' '}
                          {speaker.repeatRules.map((rule, i) => {
                            const serviceLabels = {
                              sundayMorning: 'Sun AM',
                              sundayEvening: 'Sun PM',
                              wednesdayEvening: 'Wed'
                            };
                            let ruleText = serviceLabels[rule.serviceType] || rule.serviceType;
                            if (rule.pattern === 'everyOther') {
                              ruleText += rule.startWeek === 'odd' ? ' (1st, 3rd, 5th)' : ' (2nd, 4th)';
                            } else if (rule.pattern === 'nthWeek') {
                              const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th'];
                              ruleText += ` (${ordinals[rule.nthWeek]} week)`;
                            }
                            return (
                              <span key={i} style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', marginRight: '4px' }}>
                                {ruleText}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setEditingSpeaker({ ...speaker });
                          setShowAddSpeaker(true);
                        }}
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setSpeakers(speakers.filter(s => s.id !== speaker.id))}
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: '500',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="fade-in">
            {/* Legend */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {serviceSettings.sundayMorning.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#3b82f6', borderRadius: '4px' }}></div>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: '#666' }}>
                    {serviceSettings.sundayMorning.label} ({serviceSettings.sundayMorning.time})
                  </span>
                </div>
              )}
              {serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#ec4899', borderRadius: '4px' }}></div>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: '#666' }}>
                    {serviceSettings.communion.label}
                  </span>
                </div>
              )}
              {serviceSettings.sundayEvening.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#8b5cf6', borderRadius: '4px' }}></div>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: '#666' }}>
                    {serviceSettings.sundayEvening.label} ({serviceSettings.sundayEvening.time})
                  </span>
                </div>
              )}
              {serviceSettings.wednesdayEvening.enabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '4px' }}></div>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: '#666' }}>
                    {serviceSettings.wednesdayEvening.label} ({serviceSettings.wednesdayEvening.time})
                  </span>
                </div>
              )}
            </div>

            {/* Calendar Grid - Sundays and Wednesdays Only */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Day Headers */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: (serviceSettings.sundayMorning.enabled || serviceSettings.sundayEvening.enabled) && serviceSettings.wednesdayEvening.enabled 
                  ? '1fr 1fr' 
                  : '1fr', 
                borderBottom: '1px solid #e5e0d8' 
              }}>
                {(serviceSettings.sundayMorning.enabled || serviceSettings.sundayEvening.enabled) && (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#1e3a5f',
                    background: '#f8f6f3',
                    borderRight: serviceSettings.wednesdayEvening.enabled ? '1px solid #e5e0d8' : 'none'
                  }}>
                    Sundays
                  </div>
                )}
                {serviceSettings.wednesdayEvening.enabled && (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#1e3a5f',
                    background: '#f8f6f3'
                  }}>
                    Wednesdays
                  </div>
                )}
              </div>

              {/* Service Slots */}
              <div style={{ display: 'flex' }}>
                {/* Sundays Column */}
                {(serviceSettings.sundayMorning.enabled || serviceSettings.sundayEvening.enabled) && (
                  <div style={{ 
                    flex: 1, 
                    borderRight: serviceSettings.wednesdayEvening.enabled ? '1px solid #e5e0d8' : 'none' 
                  }}>
                    {getMonthDays(selectedMonth)
                      .filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 0)
                      .map(({ date }) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const sundayMorning = schedule[`${dateKey}-sundayMorning`];
                        const sundayEvening = schedule[`${dateKey}-sundayEvening`];
                        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                        return (
                          <div key={dateKey} style={{ 
                            padding: '16px', 
                            borderBottom: '1px solid #e5e0d8',
                            background: 'white'
                          }}>
                            <div style={{
                              fontFamily: "'Outfit', sans-serif",
                              fontWeight: '600',
                              fontSize: '15px',
                              color: '#1e3a5f',
                              marginBottom: '12px'
                            }}>
                              {formattedDate}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {serviceSettings.sundayMorning.enabled && (
                                <div
                                  className="service-badge"
                                  style={{
                                    background: sundayMorning ? '#3b82f6' : '#e5e7eb',
                                    color: sundayMorning ? 'white' : '#999',
                                    cursor: 'pointer',
                                    padding: '8px 12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                  draggable={!!sundayMorning}
                                  onDragStart={() => sundayMorning && handleDragStart(`${dateKey}-sundayMorning`)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => handleDrop(`${dateKey}-sundayMorning`)}
                                  onClick={() => setAssigningSlot({ 
                                    slotKey: `${dateKey}-sundayMorning`, 
                                    serviceType: 'sundayMorning', 
                                    date: dateKey,
                                    label: `${serviceSettings.sundayMorning.label} (${serviceSettings.sundayMorning.time})`,
                                    displayDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                  })}
                                >
                                  <span>
                                    <strong>{serviceSettings.sundayMorning.time}:</strong>{' '}
                                    {sundayMorning ? getSpeakerName(sundayMorning.speakerId) : '+ Assign'}
                                  </span>
                                  {sundayMorning && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removeFromSlot(`${dateKey}-sundayMorning`); }}
                                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              )}
                              
                              {serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled && (() => {
                                const communion = schedule[`${dateKey}-communion`];
                                return (
                                  <div
                                    className="service-badge"
                                    style={{
                                      background: communion ? '#ec4899' : '#e5e7eb',
                                      color: communion ? 'white' : '#999',
                                      cursor: 'pointer',
                                      padding: '8px 12px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                    draggable={!!communion}
                                    onDragStart={() => communion && handleDragStart(`${dateKey}-communion`)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDrop(`${dateKey}-communion`)}
                                    onClick={() => setAssigningSlot({ 
                                      slotKey: `${dateKey}-communion`, 
                                      serviceType: 'communion', 
                                      date: dateKey,
                                      label: serviceSettings.communion.label,
                                      displayDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                    })}
                                  >
                                    <span>
                                      <strong>{serviceSettings.communion.label}:</strong>{' '}
                                      {communion ? getSpeakerName(communion.speakerId) : '+ Assign'}
                                    </span>
                                    {communion && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeFromSlot(`${dateKey}-communion`); }}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {serviceSettings.sundayEvening.enabled && (
                                <div
                                  className="service-badge"
                                  style={{
                                    background: sundayEvening ? '#8b5cf6' : '#e5e7eb',
                                    color: sundayEvening ? 'white' : '#999',
                                    cursor: 'pointer',
                                    padding: '8px 12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                  draggable={!!sundayEvening}
                                  onDragStart={() => sundayEvening && handleDragStart(`${dateKey}-sundayEvening`)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => handleDrop(`${dateKey}-sundayEvening`)}
                                  onClick={() => setAssigningSlot({ 
                                    slotKey: `${dateKey}-sundayEvening`, 
                                    serviceType: 'sundayEvening', 
                                    date: dateKey,
                                    label: `${serviceSettings.sundayEvening.label} (${serviceSettings.sundayEvening.time})`,
                                    displayDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                  })}
                                >
                                  <span>
                                    <strong>{serviceSettings.sundayEvening.time}:</strong>{' '}
                                    {sundayEvening ? getSpeakerName(sundayEvening.speakerId) : '+ Assign'}
                                  </span>
                                  {sundayEvening && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removeFromSlot(`${dateKey}-sundayEvening`); }}
                                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Wednesdays Column */}
                {serviceSettings.wednesdayEvening.enabled && (
                  <div style={{ flex: 1 }}>
                    {getMonthDays(selectedMonth)
                      .filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 3)
                      .map(({ date }) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const wednesdayEvening = schedule[`${dateKey}-wednesdayEvening`];
                        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                        return (
                          <div key={dateKey} style={{ 
                            padding: '16px', 
                            borderBottom: '1px solid #e5e0d8',
                            background: 'white'
                          }}>
                            <div style={{
                              fontFamily: "'Outfit', sans-serif",
                              fontWeight: '600',
                              fontSize: '15px',
                              color: '#1e3a5f',
                              marginBottom: '12px'
                            }}>
                              {formattedDate}
                            </div>
                            
                            <div
                              className="service-badge"
                              style={{
                                background: wednesdayEvening ? '#10b981' : '#e5e7eb',
                                color: wednesdayEvening ? 'white' : '#999',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              draggable={!!wednesdayEvening}
                              onDragStart={() => wednesdayEvening && handleDragStart(`${dateKey}-wednesdayEvening`)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDrop(`${dateKey}-wednesdayEvening`)}
                              onClick={() => setAssigningSlot({ 
                                slotKey: `${dateKey}-wednesdayEvening`, 
                                serviceType: 'wednesdayEvening', 
                                date: dateKey,
                                label: `${serviceSettings.wednesdayEvening.label} (${serviceSettings.wednesdayEvening.time})`,
                                displayDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                              })}
                            >
                              <span>
                                <strong>{serviceSettings.wednesdayEvening.time}:</strong>{' '}
                                {wednesdayEvening ? getSpeakerName(wednesdayEvening.speakerId) : '+ Assign'}
                              </span>
                              {wednesdayEvening && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeFromSlot(`${dateKey}-wednesdayEvening`); }}
                                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {Object.keys(schedule).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: '#666', fontFamily: "'Outfit', sans-serif" }}>
                Click "Generate Schedule" to create assignments based on speaker availability
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit Speaker Modal */}
      {showAddSpeaker && editingSpeaker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="card fade-in" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1e3a5f',
              margin: '0 0 24px 0'
            }}>
              {speakers.find(s => s.id === editingSpeaker.id) ? 'Edit Speaker' : 'Add New Speaker'}
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Name Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontWeight: '500', color: '#333' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingSpeaker.firstName}
                    onChange={(e) => setEditingSpeaker({ ...editingSpeaker, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontWeight: '500', color: '#333' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingSpeaker.lastName}
                    onChange={(e) => setEditingSpeaker({ ...editingSpeaker, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Availability */}
              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontFamily: "'Outfit', sans-serif", fontWeight: '500', color: '#333' }}>
                  Availability
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={editingSpeaker.availability.sundayMorning}
                      onChange={(e) => setEditingSpeaker({
                        ...editingSpeaker,
                        availability: { ...editingSpeaker.availability, sundayMorning: e.target.checked }
                      })}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>Sunday Morning</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={editingSpeaker.availability.sundayEvening}
                      onChange={(e) => setEditingSpeaker({
                        ...editingSpeaker,
                        availability: { ...editingSpeaker.availability, sundayEvening: e.target.checked }
                      })}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>Sunday Evening</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={editingSpeaker.availability.wednesdayEvening}
                      onChange={(e) => setEditingSpeaker({
                        ...editingSpeaker,
                        availability: { ...editingSpeaker.availability, wednesdayEvening: e.target.checked }
                      })}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>Wednesday Evening</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', paddingTop: '8px', borderTop: '1px solid #e5e0d8' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={editingSpeaker.availability.communion || false}
                      onChange={(e) => setEditingSpeaker({
                        ...editingSpeaker,
                        availability: { ...editingSpeaker.availability, communion: e.target.checked }
                      })}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>Communion (Sunday Morning)</span>
                  </label>
                </div>
              </div>

              {/* Priority Level */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Outfit', sans-serif", fontWeight: '500', color: '#333' }}>
                  Priority Level
                </label>
                <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0', fontFamily: "'Outfit', sans-serif" }}>
                  Higher priority speakers are scheduled first. Default priority speakers are rotated randomly.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingSpeaker({ ...editingSpeaker, priority: 1 })}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: editingSpeaker.priority === 1 ? '#dc2626' : '#f9fafb',
                      color: editingSpeaker.priority === 1 ? 'white' : '#666',
                      border: `2px solid ${editingSpeaker.priority === 1 ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Priority 1
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Highest</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSpeaker({ ...editingSpeaker, priority: 2 })}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: editingSpeaker.priority === 2 ? '#f59e0b' : '#f9fafb',
                      color: editingSpeaker.priority === 2 ? 'white' : '#666',
                      border: `2px solid ${editingSpeaker.priority === 2 ? '#f59e0b' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Priority 2
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>High</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSpeaker({ ...editingSpeaker, priority: 0 })}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: (!editingSpeaker.priority || editingSpeaker.priority === 0) ? '#1e3a5f' : '#f9fafb',
                      color: (!editingSpeaker.priority || editingSpeaker.priority === 0) ? 'white' : '#666',
                      border: `2px solid ${(!editingSpeaker.priority || editingSpeaker.priority === 0) ? '#1e3a5f' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Default
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Rotated</div>
                  </button>
                </div>
              </div>

              {/* Block-off Dates */}
              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontFamily: "'Outfit', sans-serif", fontWeight: '500', color: '#333' }}>
                  Block-off Dates
                </label>
                
                {editingSpeaker.blockOffDates.map((block, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      className="input-field"
                      value={block.start}
                      onChange={(e) => {
                        const newBlocks = [...editingSpeaker.blockOffDates];
                        newBlocks[idx] = { ...newBlocks[idx], start: e.target.value };
                        setEditingSpeaker({ ...editingSpeaker, blockOffDates: newBlocks });
                      }}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif", color: '#666' }}>to</span>
                    <input
                      type="date"
                      className="input-field"
                      value={block.end}
                      onChange={(e) => {
                        const newBlocks = [...editingSpeaker.blockOffDates];
                        newBlocks[idx] = { ...newBlocks[idx], end: e.target.value };
                        setEditingSpeaker({ ...editingSpeaker, blockOffDates: newBlocks });
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => {
                        const newBlocks = editingSpeaker.blockOffDates.filter((_, i) => i !== idx);
                        setEditingSpeaker({ ...editingSpeaker, blockOffDates: newBlocks });
                      }}
                      style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => setEditingSpeaker({
                    ...editingSpeaker,
                    blockOffDates: [...editingSpeaker.blockOffDates, { start: '', end: '' }]
                  })}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '2px dashed #d1d5db',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: '500',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  + Add Block-off Date Range
                </button>
              </div>

              {/* Repeat Speaking Rules */}
              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontFamily: "'Outfit', sans-serif", fontWeight: '500', color: '#333' }}>
                  Repeat Speaking Rules
                  <span style={{ fontWeight: '400', color: '#666', fontSize: '13px', display: 'block', marginTop: '4px' }}>
                    Automatically assign this speaker to specific recurring slots
                  </span>
                </label>
                
                {(editingSpeaker.repeatRules || []).map((rule, idx) => (
                  <div key={idx} style={{ 
                    background: '#f0fdf4', 
                    border: '1px solid #bbf7d0', 
                    borderRadius: '10px', 
                    padding: '12px', 
                    marginBottom: '8px' 
                  }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={rule.serviceType}
                        onChange={(e) => {
                          const newRules = [...(editingSpeaker.repeatRules || [])];
                          newRules[idx] = { ...newRules[idx], serviceType: e.target.value };
                          setEditingSpeaker({ ...editingSpeaker, repeatRules: newRules });
                        }}
                        className="input-field"
                        style={{ flex: '1', minWidth: '140px' }}
                      >
                        <option value="">Select service...</option>
                        <option value="sundayMorning">Sunday Morning</option>
                        <option value="sundayEvening">Sunday Evening</option>
                        <option value="wednesdayEvening">Wednesday Evening</option>
                      </select>
                      
                      <select
                        value={rule.pattern}
                        onChange={(e) => {
                          const newRules = [...(editingSpeaker.repeatRules || [])];
                          newRules[idx] = { ...newRules[idx], pattern: e.target.value };
                          setEditingSpeaker({ ...editingSpeaker, repeatRules: newRules });
                        }}
                        className="input-field"
                        style={{ flex: '1', minWidth: '140px' }}
                      >
                        <option value="">Select pattern...</option>
                        <option value="everyOther">Every other week</option>
                        <option value="nthWeek">Specific week of month</option>
                      </select>
                      
                      <button
                        onClick={() => {
                          const newRules = (editingSpeaker.repeatRules || []).filter((_, i) => i !== idx);
                          setEditingSpeaker({ ...editingSpeaker, repeatRules: newRules });
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    {rule.pattern === 'everyOther' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: '#666' }}>Starting on:</span>
                        <select
                          value={rule.startWeek || 'odd'}
                          onChange={(e) => {
                            const newRules = [...(editingSpeaker.repeatRules || [])];
                            newRules[idx] = { ...newRules[idx], startWeek: e.target.value };
                            setEditingSpeaker({ ...editingSpeaker, repeatRules: newRules });
                          }}
                          className="input-field"
                          style={{ flex: '1' }}
                        >
                          <option value="odd">1st, 3rd, 5th weeks</option>
                          <option value="even">2nd, 4th weeks</option>
                        </select>
                      </div>
                    )}
                    
                    {rule.pattern === 'nthWeek' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: '#666' }}>Which week:</span>
                        <select
                          value={rule.nthWeek || 1}
                          onChange={(e) => {
                            const newRules = [...(editingSpeaker.repeatRules || [])];
                            newRules[idx] = { ...newRules[idx], nthWeek: parseInt(e.target.value) };
                            setEditingSpeaker({ ...editingSpeaker, repeatRules: newRules });
                          }}
                          className="input-field"
                          style={{ flex: '1' }}
                        >
                          <option value={1}>1st week of month</option>
                          <option value={2}>2nd week of month</option>
                          <option value={3}>3rd week of month</option>
                          <option value={4}>4th week of month</option>
                          <option value={5}>5th week of month (if exists)</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={() => setEditingSpeaker({
                    ...editingSpeaker,
                    repeatRules: [...(editingSpeaker.repeatRules || []), { serviceType: '', pattern: '', startWeek: 'odd', nthWeek: 1 }]
                  })}
                  style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '2px dashed #6ee7b7',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: '500',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  + Add Repeat Rule
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAddSpeaker(false);
                  setEditingSpeaker(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!editingSpeaker.firstName.trim() || !editingSpeaker.lastName.trim()) {
                    alert('Please enter both first and last name');
                    return;
                  }
                  
                  const existingIndex = speakers.findIndex(s => s.id === editingSpeaker.id);
                  if (existingIndex >= 0) {
                    const newSpeakers = [...speakers];
                    newSpeakers[existingIndex] = editingSpeaker;
                    setSpeakers(newSpeakers);
                  } else {
                    setSpeakers([...speakers, editingSpeaker]);
                  }
                  
                  setShowAddSpeaker(false);
                  setEditingSpeaker(null);
                }}
              >
                {speakers.find(s => s.id === editingSpeaker.id) ? 'Save Changes' : 'Add Speaker'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Speaker Assignment Modal */}
      {assigningSlot && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="card fade-in" style={{ maxWidth: '450px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: '#1e3a5f',
              margin: '0 0 8px 0'
            }}>
              Assign Speaker
            </h3>
            <p style={{
              fontFamily: "'Outfit', sans-serif",
              color: '#666',
              margin: '0 0 20px 0',
              fontSize: '15px'
            }}>
              {assigningSlot.displayDate} • {assigningSlot.label}
            </p>

            {/* Available Speakers List */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontFamily: "'Outfit', sans-serif", 
                fontWeight: '500', 
                color: '#333',
                fontSize: '14px'
              }}>
                Available Speakers
              </label>
              
              {getAvailableSpeakersForSlot(assigningSlot.date, assigningSlot.serviceType).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {getAvailableSpeakersForSlot(assigningSlot.date, assigningSlot.serviceType).map(speaker => (
                    <button
                      key={speaker.id}
                      onClick={() => assignSpeakerToSlot(speaker.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: schedule[assigningSlot.slotKey]?.speakerId === speaker.id ? '#1e3a5f' : '#f8f6f3',
                        color: schedule[assigningSlot.slotKey]?.speakerId === speaker.id ? 'white' : '#1e3a5f',
                        border: '2px solid',
                        borderColor: schedule[assigningSlot.slotKey]?.speakerId === speaker.id ? '#1e3a5f' : '#e5e0d8',
                        borderRadius: '10px',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: '500',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{speaker.firstName} {speaker.lastName}</span>
                      {schedule[assigningSlot.slotKey]?.speakerId === speaker.id && (
                        <span style={{ fontSize: '13px', opacity: 0.8 }}>✓ Current</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '24px',
                  background: '#fef3c7',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                  <p style={{ 
                    fontFamily: "'Outfit', sans-serif", 
                    color: '#92400e', 
                    margin: 0,
                    fontSize: '14px'
                  }}>
                    No speakers are available for this slot. Check speaker availability settings or block-off dates.
                  </p>
                </div>
              )}
            </div>

            {/* All Speakers (override) */}
            {speakers.length > getAvailableSpeakersForSlot(assigningSlot.date, assigningSlot.serviceType).length && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontFamily: "'Outfit', sans-serif", 
                  fontWeight: '500', 
                  color: '#999',
                  fontSize: '14px'
                }}>
                  Other Speakers (not marked available)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {speakers
                    .filter(s => !isSpeakerAvailable(s, new Date(assigningSlot.date + 'T12:00:00'), assigningSlot.serviceType))
                    .map(speaker => (
                      <button
                        key={speaker.id}
                        onClick={() => assignSpeakerToSlot(speaker.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: schedule[assigningSlot.slotKey]?.speakerId === speaker.id ? '#6b7280' : 'white',
                          color: schedule[assigningSlot.slotKey]?.speakerId === speaker.id ? 'white' : '#6b7280',
                          border: '2px dashed #d1d5db',
                          borderRadius: '10px',
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: '500',
                          fontSize: '15px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{speaker.firstName} {speaker.lastName}</span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>Override</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Clear slot option */}
            {schedule[assigningSlot.slotKey] && (
              <button
                onClick={() => {
                  removeFromSlot(assigningSlot.slotKey);
                  setAssigningSlot(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: '500',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                🗑️ Remove Current Assignment
              </button>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setAssigningSlot(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="card fade-in" style={{ maxWidth: '550px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1e3a5f',
              margin: '0 0 8px 0'
            }}>
              ⚙️ Service Settings
            </h3>
            <p style={{
              fontFamily: "'Outfit', sans-serif",
              color: '#666',
              margin: '0 0 24px 0',
              fontSize: '15px'
            }}>
              Configure which services your church offers and their times
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Sunday Morning */}
              <div style={{ 
                background: serviceSettings.sundayMorning.enabled ? '#eff6ff' : '#f9fafb', 
                border: `2px solid ${serviceSettings.sundayMorning.enabled ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '12px', 
                padding: '16px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={serviceSettings.sundayMorning.enabled}
                      onChange={(e) => setServiceSettings({
                        ...serviceSettings,
                        sundayMorning: { ...serviceSettings.sundayMorning, enabled: e.target.checked }
                      })}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '16px', color: '#1e3a5f' }}>
                      Sunday Morning Service
                    </span>
                  </label>
                  <div style={{ width: '16px', height: '16px', background: '#3b82f6', borderRadius: '4px' }}></div>
                </div>
                
                {serviceSettings.sundayMorning.enabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666' }}>
                        Label
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={serviceSettings.sundayMorning.label}
                        onChange={(e) => setServiceSettings({
                          ...serviceSettings,
                          sundayMorning: { ...serviceSettings.sundayMorning, label: e.target.value }
                        })}
                        placeholder="Sunday Morning"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666' }}>
                        Time
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={serviceSettings.sundayMorning.time}
                        onChange={(e) => setServiceSettings({
                          ...serviceSettings,
                          sundayMorning: { ...serviceSettings.sundayMorning, time: e.target.value }
                        })}
                        placeholder="10:00 AM"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Communion */}
              {serviceSettings.sundayMorning.enabled && (
                <div style={{ 
                  background: serviceSettings.communion.enabled ? '#fdf2f8' : '#f9fafb', 
                  border: `2px solid ${serviceSettings.communion.enabled ? '#ec4899' : '#e5e7eb'}`,
                  borderRadius: '12px', 
                  padding: '16px',
                  marginLeft: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={serviceSettings.communion.enabled}
                        onChange={(e) => setServiceSettings({
                          ...serviceSettings,
                          communion: { ...serviceSettings.communion, enabled: e.target.checked }
                        })}
                      />
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '16px', color: '#1e3a5f' }}>
                        Communion (Sunday Morning)
                      </span>
                    </label>
                    <div style={{ width: '16px', height: '16px', background: '#ec4899', borderRadius: '4px' }}></div>
                  </div>
                  
                  {serviceSettings.communion.enabled && (
                    <div>
                      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0', fontFamily: "'Outfit', sans-serif" }}>
                        Communion speaker will never be the same as Sunday morning speaker
                      </p>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666' }}>
                          Label
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={serviceSettings.communion.label}
                          onChange={(e) => setServiceSettings({
                            ...serviceSettings,
                            communion: { ...serviceSettings.communion, label: e.target.value }
                          })}
                          placeholder="Communion"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sunday Evening */}
              <div style={{ 
                background: serviceSettings.sundayEvening.enabled ? '#f5f3ff' : '#f9fafb', 
                border: `2px solid ${serviceSettings.sundayEvening.enabled ? '#8b5cf6' : '#e5e7eb'}`,
                borderRadius: '12px', 
                padding: '16px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={serviceSettings.sundayEvening.enabled}
                      onChange={(e) => setServiceSettings({
                        ...serviceSettings,
                        sundayEvening: { ...serviceSettings.sundayEvening, enabled: e.target.checked }
                      })}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '16px', color: '#1e3a5f' }}>
                      Sunday Evening Service
                    </span>
                  </label>
                  <div style={{ width: '16px', height: '16px', background: '#8b5cf6', borderRadius: '4px' }}></div>
                </div>
                
                {serviceSettings.sundayEvening.enabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666' }}>
                        Label
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={serviceSettings.sundayEvening.label}
                        onChange={(e) => setServiceSettings({
                          ...serviceSettings,
                          sundayEvening: { ...serviceSettings.sundayEvening, label: e.target.value }
                        })}
                        placeholder="Sunday Evening"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666' }}>
                        Time
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={serviceSettings.sundayEvening.time}
                        onChange={(e) => setServiceSettings({
                          ...serviceSettings,
                          sundayEvening: { ...serviceSettings.sundayEvening, time: e.target.value }
                        })}
                        placeholder="6:00 PM"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Wednesday Evening */}
              <div style={{ 
                background: serviceSettings.wednesdayEvening.enabled ? '#ecfdf5' : '#f9fafb', 
                border: `2px solid ${serviceSettings.wednesdayEvening.enabled ? '#10b981' : '#e5e7eb'}`,
                borderRadius: '12px', 
                padding: '16px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={serviceSettings.wednesdayEvening.enabled}
                      onChange={(e) => setServiceSettings({
                        ...serviceSettings,
                        wednesdayEvening: { ...serviceSettings.wednesdayEvening, enabled: e.target.checked }
                      })}
                    />
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '16px', color: '#1e3a5f' }}>
                      Wednesday Evening Service
                    </span>
                  </label>
                  <div style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '4px' }}></div>
                </div>
                
                {serviceSettings.wednesdayEvening.enabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666' }}>
                        Label
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={serviceSettings.wednesdayEvening.label}
                        onChange={(e) => setServiceSettings({
                          ...serviceSettings,
                          wednesdayEvening: { ...serviceSettings.wednesdayEvening, label: e.target.value }
                        })}
                        placeholder="Wednesday Evening"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#666' }}>
                        Time
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={serviceSettings.wednesdayEvening.time}
                        onChange={(e) => setServiceSettings({
                          ...serviceSettings,
                          wednesdayEvening: { ...serviceSettings.wednesdayEvening, time: e.target.value }
                        })}
                        placeholder="7:00 PM"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                className="btn-primary"
                onClick={() => setShowSettings(false)}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
