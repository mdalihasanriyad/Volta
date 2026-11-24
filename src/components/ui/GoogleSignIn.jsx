import { useEffect, useRef } from 'react'
import { useCatalog } from '../../store/catalog'

// Google Identity Services button. The credential is verified on the server (POST /api/auth/google).
export default function GoogleSignIn({ onCredential }) {
  const clientId = useCatalog((s) => s.settings.googleClientId)
  const box = useRef(null)
  const cb = useRef(onCredential)
  cb.current = onCredential

  useEffect(() => {
    if (!clientId) return undefined
    let cancelled = false
    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !box.current) return
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential) })
      window.google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(400, box.current.offsetWidth || 320) })
    }
    if (window.google?.accounts?.id) init()
    else {
      let s = document.querySelector('script[data-gsi]')
      if (!s) { s = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true, defer: true }); s.dataset.gsi = '1'; document.head.appendChild(s) }
      s.addEventListener('load', init)
    }
    return () => { cancelled = true }
  }, [clientId])

  if (!clientId) return <button type="button" disabled className="btn-outline w-full">Google sign-in is not available yet</button>
  return <div ref={box} className="flex min-h-[44px] justify-center" />
}
