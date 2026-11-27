/** Error cuyo mensaje es seguro y útil para mostrar en la UI. */
export class UserFacingError extends Error {
  override name = 'UserFacingError'
}
