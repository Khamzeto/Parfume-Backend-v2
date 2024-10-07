// controllers/authController.ts

import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/userModel';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index';
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
export const getUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const users: IUser[] = await User.find();
    return res.status(200).json(users);
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Получение одного пользователя по id
export const getUserById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user: IUser | null = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }
    return res.status(200).json(user);
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Обновление данных пользователя
export const updateUser = async (req: Request, res: Response): Promise<Response> => {
  const { username, email } = req.body;

  try {
    const user: IUser | null = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Обновляем данные пользователя
    user.username = username || user.username;
    user.email = email || user.email;
    await user.save();

    return res.status(200).json({
      msg: 'Данные пользователя обновлены',
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Удаление пользователя
export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user: IUser | null = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Удаление пользователя с использованием deleteOne
    await User.deleteOne({ _id: req.params.id });

    return res.status(200).json({ msg: 'Пользователь удален' });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};
export const addToWishlist = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.params.id;
  const { perfumeId } = req.body;

  try {
    const user: IUser | null = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Проверка, есть ли парфюм уже в списке "Я хочу"
    if (!user.wishlist.includes(perfumeId)) {
      user.wishlist.push(perfumeId); // Добавление парфюма в список
      await user.save();
    }

    return res
      .status(200)
      .json({ msg: 'Парфюм добавлен в список желаемого', wishlist: user.wishlist });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Удаление парфюма из "Я хочу"
export const removeFromWishlist = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = req.params.id;
  const { perfumeId } = req.body;

  try {
    const user: IUser | null = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    user.wishlist = user.wishlist.filter((id: string) => id !== perfumeId); // Удаление парфюма
    await user.save();

    return res
      .status(200)
      .json({ msg: 'Парфюм удалён из списка желаемого', wishlist: user.wishlist });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Добавление парфюма в коллекцию
export const addToCollection = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.params.id;
  const { perfumeId } = req.body;

  try {
    const user: IUser | null = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    if (!user.perfumeCollection.includes(perfumeId)) {
      user.perfumeCollection.push(perfumeId); // Добавление парфюма в коллекцию
      await user.save();
    }

    return res
      .status(200)
      .json({ msg: 'Парфюм добавлен в коллекцию', collection: user.perfumeCollection });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Удаление парфюма из коллекции
export const removeFromCollection = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = req.params.id;
  const { perfumeId } = req.body;

  try {
    const user: IUser | null = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    user.perfumeCollection = user.perfumeCollection.filter(
      (id: string) => id !== perfumeId
    ); // Удаление парфюма
    await user.save();

    return res
      .status(200)
      .json({ msg: 'Парфюм удалён из коллекции', collection: user.perfumeCollection });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};
