export class ClientError<DetailsType> extends Error {
  public details?: DetailsType
  public error?: string
  public errorType = 'ClientError'
  public name = 'ClientError'

  constructor (message?: string, error?: string) {
    super(message)
    this.error = error
  }
}
