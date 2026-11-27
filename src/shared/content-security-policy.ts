/** En el build queda este marcador y el proceso main lo reemplaza en cada carga. */
export const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__'

export interface ContentSecurityPolicyOptions {
  /** Habilita las hojas de estilo que se crean en tiempo de ejecución (terminal, Vite) */
  nonce: string
  /** Suma lo que necesita Vite: sus scripts inline y el websocket de recarga */
  isDevelopment?: boolean
  /** `frame-ancestors` solo es válida como header HTTP, no dentro de un <meta> */
  asHeader?: boolean
}

// Política estricta: todo bloqueado salvo lo propio de la app
export function buildContentSecurityPolicy(options: ContentSecurityPolicyOptions): string {
  const { nonce, isDevelopment = false, asHeader = false } = options
  const nonceSource = `'nonce-${nonce}'`
  const directives = [
    `default-src 'none'`,
    `script-src 'self'${isDevelopment ? ` ${nonceSource}` : ''}`,
    `style-src 'self' ${nonceSource}`,
    `img-src 'self'`,
    `font-src 'self'`,
    `connect-src ${isDevelopment ? `'self'` : `'none'`}`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'none'`
  ]
  if (asHeader) directives.push(`frame-ancestors 'none'`)
  return directives.join('; ')
}
