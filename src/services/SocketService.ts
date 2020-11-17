/* External dependencies */
import { Manager, Socket } from 'socket.io-client'
import _ from 'lodash'

/* Internal dependencies */
import SocketEvent from 'constants/SocketEvent'

class SockerService {
  private manager: Manager
  private socket: Socket

  constructor() {
    this.manager = new Manager('http://localhost:4000')
    this.socket = this.manager.socket('/')
  }

  on(eventType: SocketEvent, emitter: (response: any) => void) {
    if (this.socket && _.isFunction(emitter)) {
      this.socket.on(eventType, emitter)
    }
  }

  off(eventType: SocketEvent, emitter: (response: any) => void) {
    if (this.socket && _.isFunction(emitter)) {
      this.socket.off(eventType, emitter)
    }
  }

  emit(eventType: SocketEvent, payload: any) {
    if (this.socket) {
      this.socket.emit(eventType, payload)
    }
  }
}

export default new SockerService()
