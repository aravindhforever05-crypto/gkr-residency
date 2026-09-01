import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { AuthRequest } from './auth';

export const auditLog = (action: string, entityType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original send
    const originalSend = res.json.bind(res);
    res.json = function(body: any) {
      if (res.statusCode < 400 && req.user) {
        // Log the action asynchronously
        pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            action,
            entityType,
            body?.data?.id || body?.data?.bookingId || req.params.id || null,
            JSON.stringify(req.body),
            req.ip,
          ]
        ).catch(() => {}); // Non-blocking
      }
      return originalSend(body);
    };
    next();
  };
};
