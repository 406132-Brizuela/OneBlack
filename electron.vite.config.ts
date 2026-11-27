import { randomBytes } from 'node:crypto'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import { buildContentSecurityPolicy } from './src/shared/content-security-policy'

// Inyecta la CSP en el HTML; en dev suma un nonce para los scripts y estilos que agrega Vite
function contentSecurityPolicyPlugin(nonce: string | undefined): Plugin {
  return {
    name: 'oneblack:content-security-policy',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: buildContentSecurityPolicy({ nonce })
        },
        injectTo: 'head-prepend'
      }
    ]
  }
}

export default defineConfig(({ command }) => {
  const nonce = command === 'serve' ? randomBytes(16).toString('base64') : undefined

  return {
    main: {},
    preload: {},
    renderer: {
      html: nonce ? { cspNonce: nonce } : undefined,
      build: { minify: true },
      plugins: [react(), contentSecurityPolicyPlugin(nonce)]
    }
  }
})
