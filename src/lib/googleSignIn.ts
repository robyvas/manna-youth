import { GoogleAuthProvider, browserPopupRedirectResolver, signInWithPopup } from 'firebase/auth'
import { auth } from './firebase'

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  await signInWithPopup(auth, provider, browserPopupRedirectResolver)
}
