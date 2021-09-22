import EventEmitter from 'events'
import { AsyncTask } from './index'

/**
 * Хранилище текущих активных фоновых задач для каждого пользователя.
 * Пока храним просто в оперативе, без редисов и т.д.
 */
export class AsyncTaskStorage extends EventEmitter {
  private _storage: {
    [username: string]: {
      [taskName: string]: AsyncTask
    }
  } = {}
  private static _instance: AsyncTaskStorage

  public static getInstance() {
    if (!AsyncTaskStorage._instance) {
      AsyncTaskStorage._instance = new AsyncTaskStorage()
    }

    return AsyncTaskStorage._instance
  }

  get(username: string) {
    return this._storage[username] || {}
  }

  // Добавляем задачу в в пул задач пользователя. Возвращаем boolean в случае успеха или провала.
  push(username: string, task: AsyncTask) {
    if (!username || !task) {
      return false
    }

    if (!this._storage[username]) {
      this._storage[username] = {}
    }

    // Для идемпотентности АПИ-точек. Сначала пушим задачу в пул, а затем запускаем. Так избавимся от повторного выполнения одной задачи.
    if (this._storage[username][task.name]) {
      return false
    }

    this._storage[username][task.name] = task
    this.emit('task:new', username, task)
    return true
  }

  remove(username: string, taskName: string) {
    if (!this._storage[username] || !this._storage[username][taskName]) {
      return false
    }

    delete this._storage[username][taskName]
    this.emit('task:destroyed', username, taskName)
    return true
  }
}
