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

  if (timeout !== undefined) {
    setTimeout(() => {
      messageElement.remove()
    }, timeout * 1000)
  }

  return messageElement
}

function info(msg: any, permanent?: boolean): HTMLElement {
  if (typeof msg !== 'string') {
    msg = JSON.stringify(msg)
  }
  console.info(msg)
  return message('info', msg as string, permanent === true ? undefined : 8)
}

function warn(msg: any, permanent?: boolean): HTMLElement {
  if (typeof msg !== 'string') {
    msg = JSON.stringify(msg)
  }
  console.warn(msg)
  return message('warn', msg as string, permanent === true ? undefined : 8)
}

function error(msg: any, permanent?: boolean): HTMLElement {
  if (msg instanceof Error) {
    msg = msg.message
  } else if (typeof msg !== 'string') {
    msg = JSON.stringify(msg)
  }
  console.error(msg)
  return message('error', msg as string, permanent === true ? undefined : 8)
}

// function error(error: Error | string) {
//   if (typeof error === 'string') {
//     console.error(new Error(error))
//   } else {
//     console.error(error)
//   }
// }

// function warn(error: Error | string) {
//   if (typeof error === 'string') {
//     console.warn(new Error(error))
//   } else {
//     console.warn(error)
//   }
// }

function debug(message?: any, ...optionalParams: any[]) {
  console.debug(message, ...optionalParams)
}

export default { info, error, warn, debug }
