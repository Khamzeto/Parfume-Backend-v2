import argon2 from 'argon2';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/userModel';
import perfumeModel from '../models/perfumeModel';
import fs from 'fs';
import path from 'path';
// Настройка Nodemailer
const transporter = nodemailer.createTransport({
  host: 'connect.smtp.bz', // Ваш SMTP-хост
  port: 2525, // Ваш порт
  secure: false, // Для порта 2525 используется false (не SSL)
  auth: {
    user: 'noreply@parfumetrika.ru', // Ваш логин
    pass: '}@LWXgVF.h:GI3C', // Ваш пароль
  },
  tls: {
    rejectUnauthorized: false, // Отключает проверку сертификата, если она не требуется
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

    // Хэширование пароля с использованием argon2
    const hashedPassword = await argon2.hash(password.trim());
    console.log('Оригинальный пароль:', password);
    console.log('Хэшированный пароль для сохранения:', hashedPassword);

    // Генерация 4-значного кода активации
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Создание нового пользователя
    const newUser: IUser = new User({
      username,
      email,
      password: hashedPassword, // Храним хэш пароля
      isActivated: false, // Поле для активации аккаунта
      activationCode, // Генерация 4-значного кода активации
    });
    await newUser.save();

    console.log('Пользователь успешно зарегистрирован:', newUser);

    // Отправка кода активации на email
    const mailOptions = {
      from: 'noreply@parfumetrika.ru', // Указан корректный адрес
      to: newUser.email,
      subject: 'Код активации аккаунта',
      text: `Ваш код активации: ${activationCode}`,
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

    if (!user.activationCode) {
      return res.status(400).json({
        msg: 'Код активации отсутствует. Попробуйте зарегистрироваться заново.',
      });
    }

    // Приведение к строке и удаление лишних пробелов
    const trimmedActivationCode = activationCode.toString().trim();

    if (user.activationCode.trim() !== trimmedActivationCode) {
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
// Request password reset
export const forgotPassword = async (req: Request, res: Response): Promise<Response> => {
  const { email } = req.body;

  try {
    const user: IUser | null = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь с таким email не найден' });
    }

    const resetToken = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 час

    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: 'noreply@parfumetrika.ru',
      to: user.email,
      subject: 'Сброс пароля',
      text: `Перейдите по ссылке, чтобы сбросить пароль: ${resetLink}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ msg: 'Письмо для сброса пароля отправлено.' });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  const { token, newPassword } = req.body;

  try {
    const decoded: any = jwt.verify(token, jwtSecret);
    const user: IUser | null = await User.findById(decoded.id);

    if (!user || !user.resetPasswordToken || user.resetPasswordToken !== token) {
      return res.status(400).json({ msg: 'Неверный или истёкший токен' });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ msg: 'Срок действия токена истёк' });
    }

    user.password = await argon2.hash(newPassword);
    user.resetPasswordToken = undefined; // Удаляем токен
    user.resetPasswordExpires = undefined; // Удаляем срок действия

    await user.save();

    return res.status(200).json({ msg: 'Пароль успешно сброшен.' });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

// Функция логина
export const login = async (req: Request, res: Response): Promise<Response> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
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

    // Проверяем, что пароль определён
    if (!user.password) {
      return res.status(400).json({ msg: 'Пароль отсутствует для этого пользователя' });
    }

    // Логирование данных для отладки
    console.log('Оригинальный пароль при логине:', password);
    console.log('Хэшированный пароль из базы данных:', user.password);

    // Сравниваем пароли с использованием argon2
    const isMatch = await argon2.verify(user.password, password.trim());
    console.log('Результат сравнения паролей:', isMatch);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Неправильный email или пароль' });
    }

    // Создание JWT токена
    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });

    return res.json({
      msg: 'Успешный вход',
      token,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        isVerified: user.isVerified,
        email: user.email,
        description: user.description,
        wishlist: user.wishlist,
        perfumeCollection: user.perfumeCollection,
        website: user.website,
        vkUrl: user.vkUrl,
        instagramUrl: user.instagramUrl,
        youtubeUrl: user.youtubeUrl,
        pinterestUrl: user.pinterestUrl,
        telegramUrl: user.telegramUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};
export const adminLogin = async (req: Request, res: Response): Promise<Response> => {
  // Проверка на наличие ошибок валидации
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Поиск пользователя по email
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

    // Проверяем, есть ли у пользователя роль 'admin'
    if (!user.roles.includes('admin')) {
      return res
        .status(403)
        .json({ msg: 'Доступ запрещен. У вас нет прав администратора.' });
    }

    // Проверяем, что пароль определён
    if (!user.password) {
      return res.status(400).json({ msg: 'Пароль отсутствует для этого пользователя' });
    }

    // Сравниваем пароли с использованием argon2
    const isMatch = await argon2.verify(user.password, password.trim());

    if (!isMatch) {
      return res.status(400).json({ msg: 'Неправильный email или пароль' });
    }

    // Создание JWT токена с информацией о роли
    const token = jwt.sign({ id: user._id, roles: user.roles }, jwtSecret, {
      expiresIn: '1h',
    });

    return res.json({
      msg: 'Успешный вход администратора',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
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
const saveBase64Image = (base64: string, userId: string): string => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, ''); // Убираем префикс Base64
  const buffer = Buffer.from(base64Data, 'base64'); // Преобразуем в буфер

  // Определяем корневую директорию проекта
  const rootDir = path.resolve(__dirname, '..', '..'); // Поднимаемся на уровень выше из dist
  const uploadDir = path.join(rootDir, 'uploads', 'avatars');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true }); // Создаем папку, если не существует
  }

  const fileName = `${userId}_${Date.now()}.jpg`; // Генерируем уникальное имя
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, buffer); // Сохраняем файл

  return `/uploads/avatars/${fileName}`; // Относительный путь к файлу
};
// Обновление данных пользователя
export const updateUser = async (req: Request, res: Response): Promise<Response> => {
  const {
    username,
    email,
    avatar,
    roles,
    description,
    website,
    vkUrl,
    instagramUrl,
    youtubeUrl,
    pinterestUrl,
    telegramUrl,
  } = req.body;
  const userId = req.params.id;

  try {
    const user: IUser | null = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Обновление полей, учитывая пустые строки как удаление
    user.username = username ?? user.username;
    user.email = email ?? user.email;
    user.description = description ?? user.description;

    if (roles) {
      user.roles = Array.isArray(roles) ? roles : [roles];
    }

    user.website = website === '' ? null : website || user.website;
    user.vkUrl = vkUrl === '' ? null : vkUrl || user.vkUrl;
    user.instagramUrl = instagramUrl === '' ? null : instagramUrl || user.instagramUrl;
    user.youtubeUrl = youtubeUrl === '' ? null : youtubeUrl || user.youtubeUrl;
    user.pinterestUrl = pinterestUrl === '' ? null : pinterestUrl || user.pinterestUrl;
    user.telegramUrl = telegramUrl === '' ? null : telegramUrl || user.telegramUrl;

    // Сохраняем аватар, если он передан в Base64
    if (avatar && avatar.startsWith('data:image/')) {
      const avatarPath = saveBase64Image(avatar, userId);
      user.avatar = avatarPath; // Сохраняем путь к файлу
    }

    await user.save();

    return res.status(200).json({
      msg: 'Данные пользователя обновлены',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar, // Возвращаем путь к файлу
        description: user.description,
        roles: user.roles,
        website: user.website,
        vkUrl: user.vkUrl,
        instagramUrl: user.instagramUrl,
        youtubeUrl: user.youtubeUrl,
        pinterestUrl: user.pinterestUrl,
        telegramUrl: user.telegramUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: err.message });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params; // ID пользователя
  const { oldPassword, newPassword } = req.body; // Старый и новый пароли

  try {
    // Проверяем, существует ли пользователь
    const user: IUser | null = await User.findById(userId);
    if (!user || !user.password) {
      return res
        .status(404)
        .json({ msg: 'Пользователь не найден или пароль не установлен' });
    }

    // Проверяем, совпадает ли старый пароль
    const isMatch = await argon2.verify(user.password, oldPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Неправильный старый пароль' });
    }

    // Хэшируем новый пароль и сохраняем его
    user.password = await argon2.hash(newPassword);
    await user.save();

    return res.status(200).json({ msg: 'Пароль успешно изменен' });
  } catch (error: any) {
    return res.status(500).json({ msg: 'Ошибка сервера', error: error.message });
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
// Получение списка желаемого и коллекции пользователя по userId
export const getUserCollections = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;

  try {
    const user: IUser | null = await User.findById(userId, 'wishlist perfumeCollection'); // Находим пользователя и возвращаем только нужные поля

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.status(200).json({
      wishlist: user.wishlist,
      perfumeCollection: user.perfumeCollection,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Ошибка сервера при получении данных пользователя',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
};
export const getUserWishlist = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Используем perfume_id для поиска
    const wishlistPerfumes = await perfumeModel
      .find({
        perfume_id: { $in: user.wishlist },
      })
      .select('name brand description releaseYear perfume_id main_image');

    return res.status(200).json({
      wishlist: wishlistPerfumes,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Ошибка сервера при получении данных wishlist',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
};
export const getUserPerfumeCollection = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Используем perfume_id для поиска
    const collectionPerfumes = await perfumeModel
      .find({ perfume_id: { $in: user.perfumeCollection } })
      .select('name brand description perfume_id main_image releaseYear');

    return res.status(200).json({
      perfumeCollection: collectionPerfumes,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Ошибка сервера при получении данных коллекции',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
};
export const getTotalUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const totalUsers = await User.countDocuments();
    return res.status(200).json({ totalUsers });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Ошибка сервера при подсчете пользователей',
      error: error.message,
    });
  }
};

// Контроллер для получения количества пользователей по месяцам
export const getUsersByMonth = async (req: Request, res: Response): Promise<Response> => {
  try {
    const usersByMonth = await User.aggregate([
      {
        $group: {
          _id: { $month: '$createdAt' }, // Группируем по месяцу регистрации
          count: { $sum: 1 }, // Подсчитываем количество пользователей
        },
      },
      {
        $sort: { _id: 1 }, // Сортируем по месяцу
      },
      {
        $project: {
          month: {
            $switch: {
              // Конвертируем числовой месяц в строку
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'January' },
                { case: { $eq: ['$_id', 2] }, then: 'February' },
                { case: { $eq: ['$_id', 3] }, then: 'March' },
                { case: { $eq: ['$_id', 4] }, then: 'April' },
                { case: { $eq: ['$_id', 5] }, then: 'May' },
                { case: { $eq: ['$_id', 6] }, then: 'June' },
                { case: { $eq: ['$_id', 7] }, then: 'July' },
                { case: { $eq: ['$_id', 8] }, then: 'August' },
                { case: { $eq: ['$_id', 9] }, then: 'September' },
                { case: { $eq: ['$_id', 10] }, then: 'October' },
                { case: { $eq: ['$_id', 11] }, then: 'November' },
                { case: { $eq: ['$_id', 12] }, then: 'December' },
              ],
              default: 'Unknown',
            },
          },
          count: 1,
        },
      },
    ]);

    return res.status(200).json({ usersByMonth });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Ошибка сервера при подсчете пользователей по месяцам',
      error: error.message,
    });
  }
};
export const toggleUserVerification = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;

  try {
    const user: IUser | null = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Переключаем значение isVerified
    user.isVerified = !user.isVerified;
    await user.save();

    return res.status(200).json({
      message: `Поле isVerified успешно изменено на ${user.isVerified}`,
      isVerified: user.isVerified,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Ошибка сервера при изменении статуса верификации',
      error: error.message,
    });
  }
};
