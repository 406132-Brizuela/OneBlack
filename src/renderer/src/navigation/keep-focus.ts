import type { MouseEvent } from 'react'

/**
 * Para `onMouseDown` en los controles de navegación: el clic no le quita el teclado a la
 * terminal. La navegación con teclado no se ve afectada.
 */
export function keepFocus(event: MouseEvent): void {
  event.preventDefault()
}
