import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/userModel';

// Настройка Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'iimya266@gmail.com',
    pass: 'ksnz zdqp uuyv dxmw',
  },
});

// Секрет для JWT
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

// Функция регистрации
export const register = async (req: Request, res: Response): Promise<Response> => {
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

    // Хэширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя
    const newUser: IUser = new User({
      username,
      email,
      password: hashedPassword, // Храним хэш пароля
      isActivated: false, // Поле для активации аккаунта
      activationCode: Math.floor(100000 + Math.random() * 900000).toString(), // Генерация кода активации
    });
    await newUser.save();

    // Отправка кода активации на email
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: newUser.email,
      subject: 'Код активации аккаунта',
      text: `Ваш код активации: ${newUser.activationCode}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      msg: 'Пользователь зарегистрирован. Проверьте свою почту для активации аккаунта.',
    });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Функция активации аккаунта
export const activateAccount = async (req: Request, res: Response): Promise<Response> => {
  const { email, activationCode } = req.body;

  try {
    const user: IUser | null = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'Пользователь не найден' });
    }

    if (user.isActivated) {
      return res.status(400).json({ msg: 'Аккаунт уже активирован' });
    }

    if (user.activationCode !== activationCode) {
      return res.status(400).json({ msg: 'Неправильный код активации' });
    }

    user.isActivated = true; // Активируем аккаунт
    user.activationCode = ''; // Удаляем код активации
    await user.save();

    return res.status(200).json({ msg: 'Аккаунт успешно активирован' });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Функция логина
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user: IUser | null = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'Неправильный email или пароль' });
    }

    // Проверяем, активирован ли аккаунт
    if (!user.isActivated) {
      return res
        .status(400)
        .json({ msg: 'Аккаунт не активирован. Проверьте свою почту.' });
    }

    // Сравниваем пароли
    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Неправильный email или пароль' });
    }

    // Создание JWT-токена
    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });

    return res.json({
      msg: 'Успешный вход',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        wishlist: user.wishlist,
        perfumeCollection: user.perfumeCollection,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
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
  const { username, email, avatar, roles } = req.body;
  const userId = req.params.id;

  try {
    const user: IUser | null = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Update fields if provided
    user.username = username || user.username;
    user.email = email || user.email;
    user.avatar = avatar || user.avatar; // Update avatar
    if (roles) {
      user.roles = Array.isArray(roles) ? roles : [roles]; // Update roles if provided
    }

    await user.save();

    return res.status(200).json({
      msg: 'Данные пользователя обновлены',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        roles: user.roles,
      },
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
export const assignRole = async (req: Request, res: Response): Promise<void> => {
  const { userId, role } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден.' });
      return;
    }

    // Добавляем роль, если её еще нет
    if (!user.roles.includes(role)) {
      user.roles.push(role);
    }

    await user.save();
    res.status(200).json({ message: 'Роль успешно назначена.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    res.status(500).json({ message: 'Ошибка при назначении роли.', error: errorMessage });
  }
};

// Удаление роли у пользователя
export const removeRole = async (req: Request, res: Response): Promise<void> => {
  const { userId, role } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден.' });
      return;
    }

    // Удаляем роль, если она существует
    user.roles = user.roles.filter(r => r !== role);

    await user.save();
    res.status(200).json({ message: 'Роль успешно удалена.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    res.status(500).json({ message: 'Ошибка при удалении роли.', error: errorMessage });
  }
};
