interface AddressInfo {
  city: string
  state: string
}

class Address {
  public city: string
  public state: string

  constructor (city: string, state: string) {
    this.city = city
    this.state = state
  }

  toString (): string {
    return `${this.city}, ${this.state}`
  }

  clone (): Address {
    return new Address(this.city, this.state)
  }

  equals (other: unknown): boolean {
    if (!(other instanceof Address)) {
      return false
    }
    return JSON.stringify(this) === JSON.stringify(other)
  }

  typeName (): string { // eslint-disable-line class-methods-use-this
    return 'Address'
  }

  toJSONValue (): AddressInfo {
    return {
      city: this.city,
      state: this.state
    }
  }
}

export default Address
