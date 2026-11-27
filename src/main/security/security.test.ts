import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '../../shared/content-security-policy'
import { resolveAssetPath } from './asset-path'
import { applyNonce } from './csp-nonce'
import { resolveRendererSource } from './renderer-source'

describe('resolveAssetPath', () => {
  const root = resolve('renderer')

  it('maps an app URL to a file inside the renderer folder', () => {
    expect(resolveAssetPath(root, 'app://oneblack/assets/index.js')).toBe(
      join(root, 'assets', 'index.js')
    )
  })

  it.each([
    'app://oneblack/',
    'app://other/index.html',
    'app://oneblack/..%2f..%2fsecret.txt',
    'app://oneblack/..%5c..%5csecret.txt',
    'app://oneblack/%00',
    'app://oneblack/%E0%A4%A'
  ])('never resolves outside the renderer folder: %s', (url) => {
    const result = resolveAssetPath(root, url)

    // En POSIX "\" es un nombre de archivo válido y queda dentro de la raíz
    expect(result === null || result.startsWith(join(root, '/'))).toBe(true)
  })
})

describe('resolveRendererSource', () => {
  it('trusts only the app origin in production', () => {
    const source = resolveRendererSource(undefined)

    expect(source.isTrustedUrl('app://oneblack/index.html')).toBe(true)
    expect(source.isTrustedUrl('app://evil/index.html')).toBe(false)
    expect(source.isTrustedUrl('file:///C:/index.html')).toBe(false)
    expect(source.isTrustedUrl('https://oneblack/index.html')).toBe(false)
    expect(source.isTrustedUrl('not a url')).toBe(false)
  })

  it('trusts only the dev server origin in development', () => {
    const source = resolveRendererSource('http://localhost:5173')

    expect(source.isTrustedUrl('http://localhost:5173/')).toBe(true)
    expect(source.isTrustedUrl('http://localhost:9999/')).toBe(false)
  })
})

describe('buildContentSecurityPolicy', () => {
  it('blocks everything by default and never allows unsafe sources', () => {
    const policy = buildContentSecurityPolicy({ nonce: 'abc', asHeader: true })

    expect(policy).toContain("default-src 'none'")
    expect(policy).toContain("script-src 'self';")
    expect(policy).toContain("style-src 'self' 'nonce-abc'")
    expect(policy).toContain("connect-src 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).not.toContain('unsafe')
  })

  it('only allows inline scripts and connections during development', () => {
    const policy = buildContentSecurityPolicy({ nonce: 'abc', isDevelopment: true })

    expect(policy).toContain("script-src 'self' 'nonce-abc'")
    expect(policy).toContain("connect-src 'self'")
    expect(policy).not.toContain('unsafe')
  })
})

describe('applyNonce', () => {
  it('replaces every placeholder', () => {
    const html = Buffer.from('<meta nonce="__CSP_NONCE__"><script nonce="__CSP_NONCE__">')

    expect(applyNonce(html, 'abc').toString()).toBe('<meta nonce="abc"><script nonce="abc">')
  })
})
