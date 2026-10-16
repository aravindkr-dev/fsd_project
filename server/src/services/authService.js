import User from '../models/User.js';
import { unauthorized } from '../utils/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';

export async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  // Same message for unknown email and wrong password.
  if (!user || user.status !== 'active' || !(await user.verifyPassword(password))) {
    throw unauthorized('Invalid email or password');
  }
  return { user, accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) };
}

export async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Invalid or expired refresh token');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') throw unauthorized('Account not available');
  return { user, accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) };
}
