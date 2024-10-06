// config/passport.ts

import passport from 'passport';
import passportLocal from 'passport-local';
import passportVK, { StrategyOptions as VKStrategyOptions } from 'passport-vkontakte';
import passportGoogle from 'passport-google-oauth20';
import User, { IUser } from '../models/userModel';

const LocalStrategy = passportLocal.Strategy;
const VKontakteStrategy = passportVK.Strategy;
const GoogleStrategy = passportGoogle.Strategy;

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

  // Расширяем интерфейс VKStrategyOptions для включения недостающих свойств
  interface ExtendedVKStrategyOptions extends VKStrategyOptions {
    scope?: string[];
    profileFields?: string[];
  }

  // Стратегия ВКонтакте
  const vkOptions: ExtendedVKStrategyOptions = {
    clientID: process.env.VKONTAKTE_APP_ID || '',
    clientSecret: process.env.VKONTAKTE_APP_SECRET || '',
    callbackURL: 'http://localhost:3001/auth/vkontakte/callback',
    scope: ['email'],
    profileFields: ['email', 'city', 'bdate'],
  };

  passport.use(
    new VKontakteStrategy(
      vkOptions,
      async (
        accessToken: string,
        refreshToken: string,
        params: any,
        profile: any,
        done: any
      ) => {
        try {
          const existingUser = await User.findOne({ vkId: profile.id });
          if (existingUser) {
            return done(null, existingUser);
          } else {
            const newUser = new User({
              vkId: profile.id,
              username: profile.displayName,
              email: params.email || undefined,
            });
            await newUser.save();
            return done(null, newUser);
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Стратегия Google
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: 'http://localhost:3001/auth/google/callback',
      },
      async (token: string, tokenSecret: string, profile: any, done: any) => {
        try {
          const existingUser = await User.findOne({ googleId: profile.id });
          if (existingUser) {
            return done(null, existingUser);
          } else {
            const newUser = new User({
              googleId: profile.id,
              username: profile.displayName,
              email: profile.emails[0].value,
            });
            await newUser.save();
            return done(null, newUser);
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}
