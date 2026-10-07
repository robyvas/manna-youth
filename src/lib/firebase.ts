import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth, signInAnonymously, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

// No popup resolver here: the Google sign-in code lives in the staff bundle (googleSignIn.ts).
export const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
auth.languageCode = 'ro'
export const db = getFirestore(app)

/** Participants get a silent anonymous session so rules can tie them to their own record. */
export async function ensureSignedIn() {
  await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}

export function signOutUser() {
  return signOut(auth)
}
