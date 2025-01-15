// config/passport.ts

import passport from 'passport';
import passportLocal from 'passport-local';
import User, { IUser } from '../models/userModel';

const LocalStrategy = passportLocal.Strategy;

export default function (passport: passport.PassportStatic) {
  // Сериализация пользователя
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Десериализация пользователя
  passport.deserializeUser((id, done) => {
    User.findById(id, (err: any, user: IUser) => {
      done(err, user);
    });
  });

  // Локальная стратегия для логина по email и паролю
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email: string, password: string, done) => {
        try {
          const user = await User.findOne({ email });
          if (!user) {
            return done(null, false, { message: 'Email не зарегистрирован' });
          }
          if (!user.password) {
            return done(null, false, { message: 'У данного пользователя нет пароля' });
          }
          const isMatch = await user.isValidPassword(password);
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Неверный пароль' });
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}
