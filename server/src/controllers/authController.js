import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body.email, req.body.password);
  res.json({ user, accessToken, refreshToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.refresh(req.body.refreshToken);
  res.json({ user, accessToken, refreshToken });
});

export const me = asyncHandler(async (req, res) => {
  await req.user.populate('departmentId', 'name');
  res.json({ user: req.user });
});
