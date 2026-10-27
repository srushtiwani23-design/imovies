import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { errMsg } from '../api/axios';

const TOKEN_KEY = 'imovies_token';
const USER_KEY = 'imovies_user';

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};

const persist = ({ token, user }) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clear = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    persist(data);
    return data;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

export const register = createAsyncThunk('auth/register', async (details, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', details);
    persist(data);
    return data;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  } catch (e) {
    return rejectWithValue({ status: e.response?.status });
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: readUser(),
    token: localStorage.getItem(TOKEN_KEY),
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      clear();
    },
    setUser(state, action) {
      state.user = action.payload;
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const fulfilled = (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
    };
    const rejected = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };
    builder
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, fulfilled)
      .addCase(login.rejected, rejected)
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, fulfilled)
      .addCase(register.rejected, rejected)
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        // Only sign out when the token is really invalid, not when the server is just slow
        if (action.payload?.status === 401) {
          state.user = null;
          state.token = null;
          clear();
        }
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
