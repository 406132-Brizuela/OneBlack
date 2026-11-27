export interface ContentSecurityPolicyOptions {
  /** Solo en desarrollo: habilita los elementos inline que inyecta Vite */
  nonce?: string
  /** `frame-ancestors` solo es válida como header HTTP, no dentro de un <meta> */
  asHeader?: boolean
}

// Política estricta: todo bloqueado salvo lo propio de la app
export function buildContentSecurityPolicy(options: ContentSecurityPolicyOptions = {}): string {
  const { nonce, asHeader = false } = options
  const ownSources = nonce ? `'self' 'nonce-${nonce}'` : `'self'`
  const directives = [
    `default-src 'none'`,
    `script-src ${ownSources}`,
    `style-src ${ownSources}`,
    `img-src 'self'`,
    `font-src 'self'`,
    // El websocket de recarga en caliente solo existe en desarrollo
    `connect-src ${nonce ? `'self'` : `'none'`}`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'none'`
  ]
  if (asHeader) directives.push(`frame-ancestors 'none'`)
  return directives.join('; ')
}
