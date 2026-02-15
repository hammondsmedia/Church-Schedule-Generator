// src/services/firebase.js

// Your actual configuration from the Firebase Console
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1uwoEbX9BSnmbXPBQFOdzJGSdvxv22MM",
  authDomain: "teaching-schedule-generator.firebaseapp.com",
  projectId: "teaching-schedule-generator",
  storageBucket: "teaching-schedule-generator.firebasestorage.app",
  messagingSenderId: "154699704030",
  appId: "1:154699704030:web:eba731b832f79a8170444f",
  measurementId: "G-GY9QSLRW57"
};

/**
 * Loads Firebase SDK scripts one-by-one in a strict sequence.
 * This is critical to prevent the "load firebase-app.js first" error.
 */
export const loadFirebaseScripts = async () => {
  const scripts = [
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js'
  ];

  for (const src of scripts) {
    await new Promise((resolve, reject) => {
      // Don't reload if script already exists
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      // async = false ensures execution order matches the loading order
      s.async = false; 
      s.onload = () => {
        console.log(`Successfully loaded: ${src.split('/').pop()}`);
        resolve();
      };
      s.onerror = () => reject(new Error(`Failed to load Firebase script: ${src}`));
      document.head.appendChild(s);
    });
  }
};
