import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1' });

const STORE = 'compliance_auth';
export const loadAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || null;
  } catch {
    return null;
  }
};
export const saveAuth = (auth) => {
  try {
    if (auth) localStorage.setItem(STORE, JSON.stringify(auth));
    else localStorage.removeItem(STORE);
  } catch {
    /* storage unavailable */
  }
};

api.interceptors.request.use((config) => {
  const auth = loadAuth();
  if (auth?.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

// On 401, try one refresh, then retry; otherwise force logout.
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const auth = loadAuth();
    if (error.response?.status === 401 && auth?.refreshToken && !original._retried && !original.url.includes('/auth/')) {
      original._retried = true;
      try {
        refreshing ??= axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: auth.refreshToken });
        const { data } = await refreshing;
        saveAuth({ ...auth, accessToken: data.accessToken, refreshToken: data.refreshToken });
        return api(original);
      } catch {
        saveAuth(null);
        window.location.assign('/login');
      } finally {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) => e.response?.data?.message || e.message || 'Something went wrong';
export default api;
