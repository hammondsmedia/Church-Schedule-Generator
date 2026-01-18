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
        if (window.firebase) {
          initializeFirebase();
          return;
        }

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
    if (!db.current || !user || dataLoading) return;
    
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

  // Improved Auto-save with dataLoading in dependencies
  useEffect(() => {
    if (user && firebaseReady && !dataLoading) {
      const timeoutId = setTimeout(() => {
        saveUserData();
      }, 1000); 
      
      return () => clearTimeout(timeoutId);
    }
  }, [speakers, schedule, serviceSettings, churchName, user, firebaseReady, dataLoading]);

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
      
      await result.user.updateProfile({ displayName: authName });
      
      const initialData = {
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
      };

      // Ensure data is saved to Firestore
      await db.current.collection('users').doc(result.user.uid).set(initialData);
      
      // Update local state immediately
      setChurchName(initialData.churchName);
      setServiceSettings(initialData.serviceSettings);
      setSpeakers([]);
      setSchedule({});
      
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    }
  };

  const handleLogout = async () => {
    try {
      await auth.current.signOut();
      // Clear all user-specific state
      setSpeakers([]);
      setSchedule({});
      setChurchName('');
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

  // Helper functions and remaining UI logic...
  // (Include the rest of the original helper functions and JSX from the original file)
