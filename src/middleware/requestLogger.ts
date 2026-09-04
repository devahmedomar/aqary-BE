import morgan from 'morgan';
import { env } from '../config/env';

const format = env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const requestLogger = morgan(format, {
  skip: (_req, res) => res.statusCode < 400 && env.NODE_ENV === 'test',
});
