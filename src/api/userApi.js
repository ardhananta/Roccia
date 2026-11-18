import axios from "axios";

const BASE_URL = import.meta.env.VITE_BE_BASE_URL;

export const registerUser = async (email, password) => {
  if (!email || typeof email !== 'string') {
    console.error('Invalid email for registerUser:', email);
    throw new Error('Format email tidak valid');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    console.error('Invalid password for registerUser');
    throw new Error('Password minimal 6 karakter');
  }
  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/register`,
      { email, password },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );
    console.log('Register response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Register error:', error.message, error.response?.data);
    throw new Error(
      error.response?.data?.error || "Registrasi gagal. Coba lagi."
    );
  }
};

export const loginUser = async (email, password) => {
  if (!email || typeof email !== 'string') {
    console.error('Invalid email for loginUser:', email);
    throw new Error('Format email tidak valid');
  }
  if (!password || typeof password !== 'string') {
    console.error('Invalid password for loginUser');
    throw new Error('Password harus diisi');
  }
  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/login`,
      { email, password },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );
    console.log('Login response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Login error:', error.message, error.response?.data);
    throw new Error(
      error.response?.data?.error || "Email atau password salah."
    );
  }
};

export const logoutUser = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(
      `${BASE_URL}/api/logout`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );
    console.log('Logout response:', response.data);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return response.data;
  } catch (error) {
    console.error('Logout error:', error.message, error.response?.data);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};