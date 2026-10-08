import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  initializeAuth,
  signInAnonymously,
  signOut,
} from 'firebase/auth'
import { disableNetwork, enableNetwork, initializeFirestore } from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

// The popup resolver must be ready at startup: if it loads on the first click, the Google
// window opens after an await and browsers block it as an unsolicited popup.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
})
auth.languageCode = 'ro'
// Long polling instead of streaming: Safari on iOS tends to stall streaming listeners,
// which leaves screens silently out of date until the next reload.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true })

// When a phone screen turns off or the app goes to the background, iOS drops the
// connection without Firestore noticing. Restart it as soon as the page is back in
// view (or the network returns) so changes made meanwhile arrive right away.
let hiddenAt = 0
let restarting = false
async function reconnect() {
  if (restarting) return
  restarting = true
  try {
    await disableNetwork(db)
    await enableNetwork(db)
  } finally {
    restarting = false
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > 3000) reconnect()
  })
  window.addEventListener('online', () => reconnect())
}

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
