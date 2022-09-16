declare module 'message-box' {
  type MessageFunction = (input: Record<string, unknown>) => string

  export interface MessageOptions {
    context: Record<string, unknown>
  }

  export interface ErrorDetails {
    name: string
    type: string
    value: any
  }

  export interface MessageBoxOptions {
    initialLanguage: string
    messages: Record<string, Record<string, string | MessageFunction>>
  }

  export default class MessageBox {
    constructor (messages: MessageBoxOptions)
    clone (): MessageBox
    message (error: ErrorDetails, options: MessageOptions): string
  }
}
