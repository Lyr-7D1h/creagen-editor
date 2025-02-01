export function message(
  type: 'error' | 'info' | 'warn',
  message: string,
  timeout?: number,
): HTMLElement {
  const messageElement = document.createElement('div')
  messageElement.classList.add(`message-${type}`, 'message')
  messageElement.textContent = message

  const html = document.getElementById('messages')
  html?.appendChild(messageElement)

  setTimeout(
    () => {
      messageElement.remove()
    },
    typeof timeout !== 'undefined' ? timeout * 1000 : 6000,
  )

  return messageElement
}

function formatMsg(msg: any[]): string {
  return msg
    .map((m) => {
      if (m instanceof Error) {
        return m.message
      } else if (typeof m !== 'string') {
        return JSON.stringify(m)
      } else {
        return m
      }
    })
    .join(' ')
}

function info(...msg: any[]): HTMLElement {
  console.info(...msg)
  return message('info', formatMsg(msg))
}
function warn(...msg: any[]): HTMLElement {
  console.warn(...msg)
  return message('warn', formatMsg(msg))
}
function error(...msg: any[]): HTMLElement {
  console.error(...msg)
  return message('error', formatMsg(msg))
}

function clear() {
  const html = document.getElementById('messages')!
  html.innerHTML = ''
}

function debug(...msg: any[]) {
  console.debug(msg)
}

export default { info, error, warn, debug, clear }
