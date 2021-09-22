export * from './logger'

export const isProd: () => boolean = () => {
  const environment = process.env.NODE_ENV?.toLowerCase()
  return environment === 'prod' || environment === 'production'
}

export const isDev: () => boolean = () => {
  const environment = process.env.NODE_ENV?.toLowerCase()
  return environment === 'dev' || environment === 'development'
}

export const isStage: () => boolean = () => {
  const environment = process.env.NODE_ENV?.toLowerCase()
  return environment === 'stage' || environment === 'staging'
}
