export class ClientError extends Error {
  public details?: unknown
  public error?: string
  public errorType = 'ClientError'
  public name = 'ClientError'

  constructor (message?: string, error?: string) {
    super(message)
    this.error = error
  }
}
