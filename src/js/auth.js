import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from './firebase-config.js';

export const loginWithGoogle = async () => {
    try {
        // Try popup first
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Login failed with popup:", error);
        // If it's a COOP or popup blocked error, we could potentially fallback to redirect
        // but for now let's just log it and let the user decide if they want to switch.
        throw error;
    }
};

export const loginWithGoogleRedirect = async () => {
    try {
        await signInWithRedirect(auth, googleProvider);
    } catch (error) {
        console.error("Login failed with redirect:", error);
        throw error;
    }
};

export const handleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        return result ? result.user : null;
    } catch (error) {
        console.error("Error getting redirect result:", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
        throw error;
    }
};

export const getCurrentUser = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
};

export const observeAuthState = (callback) => {
    return onAuthStateChanged(auth, callback);
};
