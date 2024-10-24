// middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index';

interface AuthRequest extends Request {
  user?: any;
}

export const jwtAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Получаем токен из заголовка
  const token = req.header('Authorization')?.split(' ')[1];

  // Проверяем наличие токена
  if (!token) {
    res.status(401).json({ msg: 'Нет токена, авторизация отклонена' });
    return;
  }

  try {
    // Проверяем и декодируем токен
    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Неверный токен' });
  }
};

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ msg: 'Не авторизован' });
};
