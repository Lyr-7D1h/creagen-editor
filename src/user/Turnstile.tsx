import React, { useEffect, useLayoutEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'auto' | 'light' | 'dark'
        },
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script'
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js'

interface TurnstileProps {
  siteKey: string
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: 'auto' | 'light' | 'dark'
}

export function Turnstile({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  theme = 'light',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Use refs so the effect doesn't re-run when callbacks change
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const onExpireRef = useRef(onExpire)
  // Keep refs in sync with latest props without causing the effect to re-run
  useLayoutEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    let widgetId: string | undefined

    function renderWidget() {
      if (!containerRef.current || !window.turnstile) return
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onSuccessRef.current(token),
        'error-callback': () => onErrorRef.current?.(),
        'expired-callback': () => onExpireRef.current?.(),
        theme,
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      let script = document.getElementById(
        TURNSTILE_SCRIPT_ID,
      ) as HTMLScriptElement | null
      if (script == null) {
        script = document.createElement('script')
        script.id = TURNSTILE_SCRIPT_ID
        script.src = TURNSTILE_SCRIPT_SRC
        script.async = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', renderWidget)
      return () => {
        script.removeEventListener('load', renderWidget)
        if (widgetId !== undefined) window.turnstile?.remove(widgetId)
      }
    }

    return () => {
      if (widgetId !== undefined) window.turnstile?.remove(widgetId)
    }
  }, [siteKey, theme])

  return <div ref={containerRef} />
}
