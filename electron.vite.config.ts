import { randomBytes } from 'node:crypto'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import {
  buildContentSecurityPolicy,
  CSP_NONCE_PLACEHOLDER
} from './src/shared/content-security-policy'

// Inyecta la CSP en el HTML
function contentSecurityPolicyPlugin(nonce: string, isDevelopment: boolean): Plugin {
  return {
    name: 'oneblack:content-security-policy',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: buildContentSecurityPolicy({ nonce, isDevelopment })
        },
        injectTo: 'head-prepend'
      }
    ]
  }
}

export default defineConfig(({ command }) => {
  const isDevelopment = command === 'serve'
  // En desarrollo no hay protocolo propio que reemplace el marcador: nonce por arranque
  const nonce = isDevelopment ? randomBytes(16).toString('base64') : CSP_NONCE_PLACEHOLDER

  return {
    main: {},
    preload: {},
    renderer: {
      html: { cspNonce: nonce },
      // La app carga desde disco: un solo paquete grande no tiene costo de red
      build: { minify: true, chunkSizeWarningLimit: 1000 },
      plugins: [react(), contentSecurityPolicyPlugin(nonce, isDevelopment)]
    }
  }
})
