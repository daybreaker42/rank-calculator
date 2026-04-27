// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCh8siP1ezpXY1vG6qxdT84C7LJt-IpZA8",
    authDomain: "gpa-calc-75d24.firebaseapp.com",
    projectId: "gpa-calc-75d24",
    storageBucket: "gpa-calc-75d24.firebasestorage.app",
    messagingSenderId: "477701882892",
    appId: "1:477701882892:web:d0887e0eeee15a3c1e5a29",
    measurementId: "G-F4LL3W2S5Q"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { 
    auth, 
    db, 
    analytics,
    googleProvider, 
    signInWithPopup, 
    signInWithRedirect,
    getRedirectResult,
    signOut, 
    onAuthStateChanged,
    doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, onSnapshot
};
