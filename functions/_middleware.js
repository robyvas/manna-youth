// Serves /lider and /admin with their own home-screen name and manifest already in the HTML.
// iOS reads the manifest once at page load, so swapping it later from JavaScript is not enough.
const SECTIONS = [
  { prefix: '/admin', name: 'Manna Admin', manifest: '/manifest-admin.webmanifest' },
  { prefix: '/lider', name: 'Manna Lider', manifest: '/manifest-lider.webmanifest' },
]

export async function onRequest(context) {
  const response = await context.next()
  if (!(response.headers.get('content-type') || '').includes('text/html')) return response

  const path = new URL(context.request.url).pathname.toLowerCase()
  const section = SECTIONS.find((s) => path.startsWith(s.prefix))
  if (!section) return response

  return new HTMLRewriter()
    .on('link[rel="manifest"]', { element: (el) => el.setAttribute('href', section.manifest) })
    .on('meta[name="apple-mobile-web-app-title"]', { element: (el) => el.setAttribute('content', section.name) })
    .on('title', { element: (el) => el.setInnerContent(section.name) })
    .transform(response)
}
