import 'express';
import { PublicAdminUser } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      adminUser?: PublicAdminUser;
    }
  }
}

export {};
