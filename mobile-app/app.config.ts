import 'dotenv/config';
import { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      APP_ENV: process.env.APP_ENV,
      API_URL: process.env.API_URL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL
    },
  };
};
