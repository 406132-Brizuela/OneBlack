import { CSP_NONCE_PLACEHOLDER } from '../../shared/content-security-policy'

/** Pone el nonce de esta carga en todos los lugares que el build dejó marcados. */
export function applyNonce(html: Buffer, nonce: string): Buffer {
  return Buffer.from(html.toString('utf8').replaceAll(CSP_NONCE_PLACEHOLDER, nonce), 'utf8')
}
