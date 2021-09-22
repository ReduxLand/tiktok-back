import { Server, Socket } from 'socket.io'
import { AsyncTaskStorage } from '../lib/async-task/storage'
import { restrictedAccess } from './middleware'
import { AsyncTask } from '../lib/async-task'

export const ioCtrl = (io: Server) => {
  const taskStorage = AsyncTaskStorage.getInstance()
  const socketStorage: {
    [username: string]: Socket[]
  } = {}

  // Сначала таску всегда добавляем в сторейдж, а только потом стартуем. Это нужно, чтобы инфа о новой таске улетела на фронт
  // до его начала, а затем мы уже по имени таски, когда она стартует, связали её с добавленной и отслеживали.
  taskStorage.on('task:new', (username, task) => {
    if (!socketStorage[username]) {
      socketStorage[username] = []
    }

    for (const socket of socketStorage[username]) {
      socket.emit('task:new', task.toObject())

      // Регаем события для новой задачи
      setTaskListeners(socket, task, taskStorage)
    }
  })

  taskStorage.on('task:destroyed', (username, taskName) => {
    if (!socketStorage[username]) {
      socketStorage[username] = []
    }

    for (const socket of socketStorage[username]) {
      socket.emit('task:destroyed', taskName)
    }
  })

  io.use(restrictedAccess)

  io.on('connection', (socket) => {
    if (!socketStorage[socket.user.username]) {
      socketStorage[socket.user.username] = []
    }
    const index = socketStorage[socket.user.username].push(socket) - 1 // Запоминаем индекс сокета

    // При новом коннекте сначала отдаём юзеру все его активные таски, а затем подписываем на события их обновления
    const tasks = taskStorage.get(socket.user.username)
    const taskList = Object.values(tasks).map((task) => {
      setTaskListeners(socket, task, taskStorage)
      return {
        // log: task.log,
        name: task.name,
        type: task.type,
        progress: task.progress,
      }
    })

    socket.emit('task:list', taskList)

    socket.on('disconnect', () => {
      socketStorage[socket.user.username].splice(index, 1) // При дисконнекте удаляем сокет из пула
    })
  })
}

function setTaskListeners(socket: Socket, task: AsyncTask, taskStorage: AsyncTaskStorage) {
  task.on('init', () => {
    // do nothing
  })
  task.on('run', () => socket.emit('task:run', task.name))
  task.on('done', () => {
    socket.emit('task:done', task.toObject())
    taskStorage.remove(socket.user.username, task.name)
  })
  task.on('progress:success', (progress: number) =>
    socket.emit('task:progress:success', task.name, progress),
  )
  task.on('progress:failure', (progress: number) =>
    socket.emit('task:progress:failure', task.name, progress),
  )
  task.on('subtask:new', (log) => socket.emit('task:subtask:new', task.name, log))
  task.on('subtask:update', (log, subtaskId) =>
    socket.emit('task:subtask:update', task.name, log, subtaskId),
  )
}
