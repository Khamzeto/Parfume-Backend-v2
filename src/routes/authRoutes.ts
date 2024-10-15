// routes/auth.ts

import express from 'express';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  logout,
  getUsers,
  getUserById,
  assignRole,
  removeRole,
} from '../controllers/authController';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

// Интерфейс для расширения Request и добавления свойства user
interface AuthRequest extends Request {
  user?: any; // Свойство 'user' теперь опционально
}

router.post('/assign-role', assignRole);

// Маршрут для удаления роли (только для админов)
router.post('/remove-role', checkRole(['editor']), removeRole);

router.post(
  '/register',
  [
    body('username', 'Имя пользователя обязательно').notEmpty(),
    body('email', 'Введите корректный email').isEmail(),
    body('password', 'Пароль должен быть не менее 6 символов').isLength({ min: 6 }),
  ],
  register
);

// Логин пользователя
router.post(
  '/login',
  [
    body('email', 'Введите корректный email').isEmail(),
    body('password', 'Пароль обязателен').exists(),
  ],
  login
);

// Выход
router.get('/logout', logout);

// Аутентификация через ВКонтакте
router.get('/vkontakte', passport.authenticate('vkontakte', { session: false }));

// Callback ВКонтакте
router.get(
  '/vkontakte/callback',
  passport.authenticate('vkontakte', { failureRedirect: '/login', session: false }),
  (req: AuthRequest, res: Response) => {
    // Создание JWT-токена
    const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
    res.redirect(`http://localhost:3000/?token=${token}`); // Перенаправление на фронтенд с токеном
  }
);

// Аутентификация через Google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Callback Google
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req: AuthRequest, res: Response) => {
    // Создание JWT-токена
    const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
    res.redirect(`http://localhost:3000/?token=${token}`); // Перенаправление на фронтенд с токеном
  }
);

export default router;
