import type { OneBlackApi } from '../../shared/ipc'

declare global {
  interface Window {
    oneblack: OneBlackApi
  }
}
