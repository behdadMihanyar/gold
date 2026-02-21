/* eslint-disable no-unused-vars */
import { useState } from "react";
import supabase from "./supabase";
import { useNavigate } from "react-router-dom";
import background_img from "./img/background_img.jpg";
import logo from "./img/logo.png";
import { toast } from "react-toastify";

const LogIn = () => {
  //States
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  //Change Login/SignUp
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  //SignUp
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      console.log(error.message);
    }
    toast.success("تاییدیه ایمیل برای شما ارسال شد");
  };
  //Login
  const handleLogIn = async () => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      alert(error.message);
    }
    if (data) {
      navigate("/");
    }
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
    <div
      className="min-h-screen flex flex-col items-center bg-gray-800 px-4"
      style={{ backgroundImage: `url(${background_img})` }}
    >
      {/* Logo */}
      <h2 className="text-xl font-bold text-center pt-10 mt-10">
        <img src={logo} alt="سکه قصر" width={100} height={100} />
      </h2>
      <h3 className="text-shadow-lg/20">پنل مدیریت خرید/فروش سکه قصر</h3>

      {/* Form Card */}
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md shadow-xl/30 shadow-blue-700 mt-10">
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:scale-105 focus:ring-blue-500 focus:outline-none transition"
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:scale-105 focus:ring-blue-500 focus:outline-none transition"
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
            className="w-full bg-blue-600 cursor-pointer text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {isLogin ? "ورود" : "ثبت نام"}
          </button>
        </form>

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
