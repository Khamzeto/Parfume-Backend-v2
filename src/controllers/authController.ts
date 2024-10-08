// controllers/authController.ts

import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config';
import { validationResult } from 'express-validator';
import passport from 'passport';

export const register = async (req: Request, res: Response): Promise<Response> => {
  // Проверка валидации
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Проверка существования пользователя
    const existingUser: IUser | null = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'Пользователь с таким email уже существует' });
    }

    // Создание нового пользователя
    const newUser: IUser = new User({ username, email, password });
    await newUser.save();

    // Создание JWT-токена
    const token = jwt.sign({ id: newUser._id }, jwtSecret, { expiresIn: '1h' });

    return res.status(201).json({
      msg: 'Пользователь успешно зарегистрирован',
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email },
    });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Проверка валидации
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  passport.authenticate(
    'local',
    { session: false },
    (err: any, user: IUser, info: any) => {
      if (err || !user) {
        return res
          .status(400)
          .json({ msg: info ? info.message : 'Не удалось авторизоваться' });
      }

      req.login(user, { session: false }, err => {
        if (err) {
          res.status(500).json({ msg: 'Ошибка сервера' });
          return;
        }
        // Создание JWT-токена
        const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });
        return res.json({
          msg: 'Успешный вход',
          token,
          user: { id: user._id, username: user.username, email: user.email },
        });
      });
    }
  )(req, res, next);
};

export const logout = (req: Request, res: Response): void => {
  req.logout(err => {
    if (err) {
      res.status(500).json({ msg: 'Ошибка при выходе' });
      return;
    }
    res.json({ msg: 'Вы вышли из системы' });
  });
};
