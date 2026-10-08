import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SECTIONS = {
  in: { name: 'Manna Youth', manifest: '/manifest-in.webmanifest' },
  lider: { name: 'Manna Lider', manifest: '/manifest-lider.webmanifest' },
  admin: { name: 'Manna Admin', manifest: '/manifest-admin.webmanifest' },
} as const

/**
 * "Add to Home Screen" suggests a name per section: iOS reads the apple-mobile-web-app-title
 * meta, Android reads the linked manifest. Both are swapped when the route changes.
 */
export function useHomeScreenName() {
  const { pathname } = useLocation()
  const path = pathname.toLowerCase()
  const section = path.startsWith('/admin') ? SECTIONS.admin : path.startsWith('/lider') ? SECTIONS.lider : SECTIONS.in

  useEffect(() => {
    document.title = section.name
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', section.name)
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (link && link.getAttribute('href') !== section.manifest) link.setAttribute('href', section.manifest)
  }, [section])
}
