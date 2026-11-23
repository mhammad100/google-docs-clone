import client from './client';
import { asyncCatcher } from './asyncCatcher';

export const login = (payload) => asyncCatcher(() => client.post('/auth/login', payload));

export const register = (payload) => asyncCatcher(() => client.post('/auth/register', payload));

export const getMe = () => asyncCatcher(() => client.get('/auth/me'));

export const changePassword = (payload) => asyncCatcher(() => client.patch('/auth/password', payload));
