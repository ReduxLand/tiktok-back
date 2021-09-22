export enum EAsyncTaskType {
  CampaignLoad = 'CampaignLoad',
}

export type TAsyncTask = {
  type: EAsyncTaskType,
}

export enum ESocketEvent {
  Test = 'Test1',
  Test2 = 'Test2',
}

/*
TODO задачи:
  1. Синхронизация статуса с фронтом при загрузке страницы
  2. Передача реалтаймовых обновлений на фронт
 */

export interface ISocketEventEmitter {
  emit(event: ESocketEvent.Test, payload: 'foo'): boolean
  emit(event: ESocketEvent.Test2, payload: 'bar'): boolean
}
