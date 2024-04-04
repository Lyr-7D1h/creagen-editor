export function error(error: Error | string) {
  if (typeof error === 'string') {
    console.error(new Error(error))
  } else {
    console.error(error)
  }
}
