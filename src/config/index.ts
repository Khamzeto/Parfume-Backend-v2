// config/index.ts

export const jwtSecret: string = process.env.JWT_SECRET || 'your_jwt_secret';
export const mongoURI: string = process.env.MONGO_URI || 'mongodb://localhost/yourdbname';
export const sessionSecret: string = process.env.SESSION_SECRET || 'your_session_secret';

// Учетные данные приложения ВКонтакте
export const vkAppId: string = process.env.VKONTAKTE_APP_ID || '';
export const vkAppSecret: string = process.env.VKONTAKTE_APP_SECRET || '';
export const vkCallbackURL: string =
  process.env.VKONTAKTE_CALLBACK_URL || 'http://localhost:3001/auth/vkontakte/callback';

// Учетные данные приложения Google
export const googleClientId: string = process.env.GOOGLE_CLIENT_ID || '';
export const googleClientSecret: string = process.env.GOOGLE_CLIENT_SECRET || '';
export const googleCallbackURL: string =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback';
