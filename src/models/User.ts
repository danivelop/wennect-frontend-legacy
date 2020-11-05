/* External dependencies */
import Immutable from 'immutable'

export interface UserAttr {
  id: number
  username: string
}

const UserRecord = Immutable.Record<UserAttr>({
  id: 0,
  username: '',
})

class User extends UserRecord {
  constructor(args: any = {}) {
    super(args)
  }

  getId() {
    return this.id
  }

  getUsername() {
    return this.username
  }
}

export default User
