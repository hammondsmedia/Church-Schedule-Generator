// src/services/firebase.js

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1uwoEbX9BSnmbXPBQFOdzJGSdvxv22MM",
  authDomain: "teaching-schedule-generator.firebaseapp.com",
  projectId: "teaching-schedule-generator",
  storageBucket: "teaching-schedule-generator.firebasestorage.app",
  messagingSenderId: "154699704030",
  appId: "1:154699704030:web:eba731b832f79a8170444f"
};

export const FIREBASE_URLS = {
  APP: 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  AUTH: 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  FIRESTORE: 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
};

/**
 * Utility to load the external Firebase scripts once.
 */
export const loadFirebaseScripts = () => {
  if (window.firebase) return Promise.resolve();

  const loadScript = (url) => new Promise((resolve, reject) => {
    const s = document.createElement('script'); 
    s.src = url; 
    s.onload = resolve; 
    s.onerror = reject; 
    document.head.appendChild(s);
  });

  return Promise.all([
    loadScript(FIREBASE_URLS.APP),
    loadScript(FIREBASE_URLS.AUTH),
    loadScript(FIREBASE_URLS.FIRESTORE)
  ]);
};
