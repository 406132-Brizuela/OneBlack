// xterm.js crea hojas <style> en tiempo de ejecución y no acepta un nonce. La CSP solo
// permite las que lo llevan, así que se asigna a cada <style> creado desde código.
// El HTML inyectado como marcado no pasa por createElement y sigue bloqueado.

function readNonce(document: Document): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')
  return meta ? meta.nonce || meta.getAttribute('content') : null
}

export function allowRuntimeStyles(document: Document): void {
  const nonce = readNonce(document)
  if (!nonce) return
  const createElement = document.createElement.bind(document)
  document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
    const element = createElement(tagName, options)
    if (element instanceof HTMLStyleElement) element.nonce = nonce
    return element
  })
}
