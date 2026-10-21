import { describe, expect, test } from 'vitest'
import {
  SANDBOX_HANDSHAKE_NONCE_PARAM,
  createHandshakeNonce,
  withHandshakeNonce,
} from './SandboxMessageHandler'

describe('createHandshakeNonce', () => {
  test('returns a non-empty string', () => {
    const nonce = createHandshakeNonce()
    expect(typeof nonce).toBe('string')
    expect(nonce.length).toBeGreaterThan(0)
  })

  test('returns different values on consecutive calls', () => {
    expect(createHandshakeNonce()).not.toBe(createHandshakeNonce())
  })
})

describe('withHandshakeNonce', () => {
  test('appends the nonce to a relative runtime url', () => {
    const url = withHandshakeNonce('/sandbox-runtime/', 'abc123')
    expect(url).toBe('http://localhost:3000/sandbox-runtime/?nonce=abc123')
  })

  test('appends the nonce to an absolute runtime url', () => {
    const url = withHandshakeNonce('https://runtime.example.com/', 'abc123')
    expect(url).toBe('https://runtime.example.com/?nonce=abc123')
  })

  test('keeps existing query parameters', () => {
    const url = withHandshakeNonce(
      'https://runtime.example.com/?mode=dev',
      'abc123',
    )
    expect(url).toBe('https://runtime.example.com/?mode=dev&nonce=abc123')
  })

  test('overrides a previously stamped nonce', () => {
    const url = withHandshakeNonce(
      'https://runtime.example.com/?nonce=old',
      'new',
    )
    expect(url).toBe('https://runtime.example.com/?nonce=new')
  })

  test('uses the configured parameter name', () => {
    const url = withHandshakeNonce('/sandbox-runtime/', 'abc123')
    expect(new URL(url).searchParams.get(SANDBOX_HANDSHAKE_NONCE_PARAM)).toBe(
      'abc123',
    )
  })
})
