import EventEmitter from 'events'
import { initLogger } from '../../util'

type TStep = {
  description: string
  isDone: boolean
  isSucceed: boolean
  error?: string
}

const log = initLogger('AsyncTasker')

/**
 * Класс асинхронной таски.
 * Занимается наблюдением за состояниеем долгой задачи и при необходимости перзистингом этого состояния в БД.
 * Также здесь реализован коннектор с Socket.IO для эмиттинга эвентов с нужными структурами.
 */
export abstract class AsyncTask<T = unknown> extends EventEmitter {
  // Имя задачи. В случаи залива РК - имя заливаемой РК
  private readonly _name: string

  // Тип задачи. Пока только один - CampaignLoad
  private readonly _type: string

  // Шаг прогресса в %. Пока в простом варианте 100% / количество аккаунтов для залива.
  private readonly _progressStep: number

  /**
   * Уровень прогресса в % для каждого типа результата выполнения шага.
   *  Success - если шаг завершён успешно;
   *  Failure - если во время выполнения возникли ошибки, требующие повторного выполнения или нет.
   *
   * @private
   */
  private _progress = {
    success: 0,
    failure: 0,
  }

  private _retryCount = 0

  // Пул логов подзадач с их полным описанием
  private _subtaskLogPool: TStep[] = []

  // Модель для экстракции полезной нагрузки задачи, которая используется в её алгоритме
  protected _model: T

  // Модель с полезной нагрузкой повторного выполнения задачи (в случае наличия неудачных шагов)
  protected _retryModel: T

  // Дополнительная полезная нагрузка
  protected abstract _payload: unknown

  get name() {
    return this._name
  }

  get type() {
    return this._type
  }

  get log() {
    return this._subtaskLogPool
  }

  get progress() {
    return this._progress
  }

  toObject() {
    return {
      name: this._name,
      type: this._type,
      progress: this._progress,
      // log: this._subtaskLogPool,
    }
  }

  protected constructor(name: string, type: string, stepsCount = 1) {
    super()

    if (!name) {
      throw new Error('Имя задачи должно быть указано.')
    }

    if (stepsCount < 1) {
      throw new Error('Количество шагов должно быть больше 0.')
    }

    this._name = name
    this._type = type
    this._progressStep = Math.round(100 / stepsCount)
  }

  init(model?: T, payload?: unknown) {
    this.emit('init')
    this._model = model
    this._payload = payload
  }

  async retry() {
    // Пока жестко хардкодим 1 повторное выполнение
    if (++this._retryCount <= 1) {
      this.emit('retry', this._retryCount)
      this._model = this._retryModel
      delete this._retryModel
      this._progress.failure = 0
      await this.run()
    }
    this.emit('done')
  }

  abstract run(): Promise<void>

  logStartSubtask(description: string, isDone = false) {
    const operation: TStep = {
      description,
      isDone: isDone,
      isSucceed: isDone, // Даём возможность сразу закончить сабтаску, и если закончили сразу - значит точно Success.
      error: '',
    }

    this.emit('subtask:new', operation)

    // Возвращаем индекс добавленной работы в общем пуле подзадач. По этому индексу будем закрывать саб-таску в другом методе.
    return this._subtaskLogPool.push(operation) - 1
  }

  logUpdateSubtask(subtaskIndex: number, isSucceed = true, error = '') {
    if (!this._subtaskLogPool[subtaskIndex]) {
      log.error('Несуществующий индекс подзадачи.', {
        name: this._name,
        type: this._type,
        stack: new Error('').stack,
      })
      return
    }

    this._subtaskLogPool[subtaskIndex].error = error
    this._subtaskLogPool[subtaskIndex].isDone = true
    this._subtaskLogPool[subtaskIndex].isSucceed = isSucceed

    this.emit('subtask:update', this._subtaskLogPool[subtaskIndex], subtaskIndex)
  }

  // Добавляем шаг успешного прогресса
  addSuccessProgress() {
    if (this._progress.success + this._progress.failure < 100) {
      this._progress.success += this._progressStep
    }

    if (this._progress.success + this._progress.failure > 100) {
      this._progress.success = 100 - this._progress.failure
    }

    this.emit('progress:success', this._progress.success)
    return this._progress.success
  }

  // Добавляем шаг провального прогресса
  addFailureProgress() {
    if (this._progress.success + this._progress.failure < 100) {
      this._progress.failure += this._progressStep
    }

    if (this._progress.success + this._progress.failure > 100) {
      this._progress.failure = 100 - this._progress.success
    }

    this.emit('progress:failure', this._progress.failure)
    return this._progress.failure
  }
}
