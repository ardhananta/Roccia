import React, { useState } from "react";
import Logo from "/Roccia white.png";
import { useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../api/userApi";
import { useAuth } from "../api/authContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // Ambil login dari context
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log(isLoginMode ? 'Login untuk email:' : 'Register untuk email:', emailInput);
      
      let response;
      if (isLoginMode) {
        response = await loginUser(emailInput, passwordInput);
      } else {
        response = await registerUser(emailInput, passwordInput);
      }

      // Validasi dan simpan menggunakan context
      if (response && response.token && response.user) {
        login(response.token, response.user); // Simpan ke context dan localStorage
        console.log('Token dan user berhasil disimpan');
        navigate("/", { replace: true }); // Redirect ke home setelah login berhasil
      } else {
        throw new Error('Response tidak valid: token atau user tidak diterima dari server');
      }
    } catch (err) {
      setError(err.message || (isLoginMode ? "Login gagal. Coba lagi." : "Registrasi gagal. Coba lagi."));
      console.error('Error in handleSubmit:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError("");
    setEmailInput("");
    setPasswordInput("");
  };

  return (
    <div className="flex h-screen font-sans">
      <div
        className="w-1/2 bg-cover bg-center relative hidden lg:block"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/dm8cekwjg/image/upload/v1753773855/Rectangle_94_n3lmju.png')",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center px-16 text-white">
          <div className="w-44">
            <img src={Logo} alt="Roccia Logo" className="" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {isLoginMode ? "Welcome Back" : "Create Your Account"}
          </h1>
          <p className="text-lg">
            {isLoginMode 
              ? "Sign in to continue your journey with Roccia"
              : "Start your journey with Roccia — where concrete meets elegance."}
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <h2 className="text-2xl font-semibold text-center mb-2">
            {isLoginMode ? "Sign In" : "Sign Up"}
          </h2>
          <p className="text-sm text-center text-gray-600 mb-6">
            {isLoginMode 
              ? "Masuk dengan email dan password Anda"
              : "Daftar dengan email dan password"}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="border border-gray-300 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />

            <input
              type="password"
              placeholder="Password (minimal 6 karakter)"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="border border-gray-300 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              minLength="6"
            />

            <button
              type="submit"
              disabled={loading}
              className={`bg-red-800 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading 
                ? (isLoginMode ? "Signing in..." : "Creating account...")
                : (isLoginMode ? "Sign In" : "Create Account")}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              {isLoginMode ? "Belum punya akun? " : "Sudah punya akun? "}
              <button
                type="button"
                onClick={toggleMode}
                className="text-red-800 font-semibold hover:underline cursor-pointer"
              >
                {isLoginMode ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;