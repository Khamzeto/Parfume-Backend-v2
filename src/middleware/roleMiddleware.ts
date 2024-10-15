import { Request, Response, NextFunction } from 'express';
import User from '../models/userModel'; // Импорт модели пользователя

export const checkRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.userId || req.params.userId;
      if (!userId) {
        return res.status(403).json({ message: 'Пользователь не авторизован.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(403).json({ message: 'Пользователь не найден.' });
      }

      // Проверяем, есть ли у пользователя одна из необходимых ролей
      const hasRole = roles.some(role => user.roles.includes(role));
      if (!hasRole) {
        return res
          .status(403)
          .json({ message: 'У вас нет прав для выполнения этого действия.' });
      }

      next(); // Продолжаем выполнение, если роль соответствует
    } catch (error) {
      res.status(500).json({ message: 'Ошибка авторизации.' });
    }
  };
};
