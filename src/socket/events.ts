import { Socket } from 'socket.io'
import { ESocketEvent, ISocketEventEmitter } from './types'

// TODO сформировать enums и интерфейсы для наших эвентов
export class SocketEvent implements ISocketEventEmitter {
  private readonly _socket: Socket

  constructor(socket: Socket) {
    this._socket = socket
  }

  emit(event: ESocketEvent, payload: 'foo' | 'bar') {
    return this._socket.emit(event, payload)
  }
}
