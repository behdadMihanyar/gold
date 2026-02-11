import { useState } from "react";
import supabase from "./supabase";
import { useNavigate } from "react-router-dom";

const LogIn = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      console.log(error.message);
    }
  };
  const handleLogIn = async () => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (data) {
      navigate("/");
    }
    console.log(data);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLogin) {
      handleSignUp();
    }
    handleLogIn();
    console.log(isLogin ? "Login Data:" : "Signup Data:", formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isLogin ? "ورود کاربران" : "ساخت حساب کاربری"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 text-right">
              ایمیل
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              dir="ltr"
              placeholder="you@example.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 text-right">
              رمز عبور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                dir="ltr"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "پنهان" : "نمایش"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {isLogin ? "ورود" : "ثبت نام"}
          </button>
        </form>

        {/* Toggle Mode */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? "حساب کاربری ندارید؟" : "حساب کاربری دارید؟"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-medium hover:underline ml-1"
          >
            {isLogin ? "ایجاد حساب کاربری" : "ورود کاربران"}
          </button>
        </p>
      </div>
    </div>
  );
};
export default LogIn;
