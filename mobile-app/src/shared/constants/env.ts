import Constants from 'expo-constants'

interface Env {
  APP_ENV: string
  API_URL: string
  BETTER_AUTH_URL: string
}

const extra = Constants.expoConfig?.extra as Env

export const ENV: Env = {
  APP_ENV: extra.APP_ENV,
  API_URL: extra.API_URL,
  BETTER_AUTH_URL: extra.BETTER_AUTH_URL
}
