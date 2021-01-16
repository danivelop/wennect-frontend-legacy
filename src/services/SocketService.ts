/* External dependencies */
import { Manager, Socket } from 'socket.io-client'
import _ from 'lodash'

/* Internal dependencies */
import SocketEvent from 'constants/SocketEvent'

class SockerService {
  private manager: Manager
  private socket: Socket

  constructor() {
    this.manager = new Manager('https://192.168.0.2:4000')
    this.socket = this.manager.socket('/')
  }

  on(eventType: SocketEvent, emitter: (...args: any[]) => void) {
    if (this.socket && _.isFunction(emitter)) {
      this.socket.on(eventType, emitter)
    }
  }

  off(eventType: SocketEvent) {
    if (this.socket) {
      this.socket.off(eventType)
    }
  }

  emit(eventType: SocketEvent, ...args: any[]) {
    if (this.socket) {
      this.socket.emit(eventType, ...args)
    }
  }
}

export default new SockerService()
