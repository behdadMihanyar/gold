import React, { useState } from "react";
import supabase from "./supabase";

const AddOrder = () => {
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    price: "",
    description: "",
    date: "",
    total: "",
    delivery: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Format price with thousand separators
    if (name === "price") {
      // Remove all non-digit characters
      const numericValue = value.replace(/\D/g, "");
      // Format with thousand separators
      const formattedPrice = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "/");

      const quantity = formData.quantity;
      const price = numericValue;

      setFormData({
        ...formData,
        price: formattedPrice,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      });
    } else if (name === "quantity") {
      const quantity = value;
      const price = formData.price.replace(/\D/g, ""); // Remove slashes for calculation

      setFormData({
        ...formData,
        quantity: value,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("tasks").insert(formData);
    if (error) {
      console.log(error.message);
    } else {
      setFormData({
        name: "",
        quantity: "",
        price: "",
        description: "",
        date: "",
        total: "",
        delivery: "",
      });
      alert("Order submitted successfully!");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <h2 className="text-3xl font-bold text-gray-800 col-span-full mb-6 text-center">
          ثبت سفارش جدید
        </h2>

        {/* Name */}
        <div className="relative w-full group">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="block py-2.5 px-0 w-full text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
            placeholder=" "
            required
          />
          <label className="absolute text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 pointer-events-none">
            نام
          </label>
        </div>

        {/* Quantity */}
        <div className="relative w-full group">
          <input
            type="text"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            className="block py-2.5 px-0 w-full text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
            placeholder=" "
            required
          />
          <label className="absolute text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 pointer-events-none">
            تعداد
          </label>
        </div>

        {/* Price */}
        <div className="relative w-full group">
          <input
            type="text"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="block py-2.5 px-0 w-full text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
            placeholder=" "
            required
          />
          <label className="absolute text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 pointer-events-none">
            نرخ
          </label>
        </div>

        {/* Total */}
        <div className="relative w-full group">
          <input
            type="text"
            name="total"
            value={formData.total}
            readOnly
            className="block py-2.5 px-0 w-full text-gray-500 bg-gray-100 outline-none border-0 border-b-2 border-gray-300 appearance-none cursor-not-allowed peer"
            placeholder=" "
          />
          <label className="absolute text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] pointer-events-none">
            جمع کل
          </label>
        </div>

        {/* Date */}
        <div className="relative w-full group">
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="block py-2.5 px-0 w-full text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
            placeholder=" "
            required
          />
          <label className="absolute text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 pointer-events-none">
            تاریخ
          </label>
        </div>

        {/* Delivery */}
        <div className="relative w-full group">
          <input
            type="text"
            name="delivery"
            value={formData.delivery}
            onChange={handleChange}
            className="block py-2.5 px-0 w-full text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
            placeholder=" "
          />
          <label className="absolute text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 pointer-events-none">
            تحویل دهنده
          </label>
        </div>

        {/* Description - full width */}
        <div className="relative w-full group col-span-full">
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="block py-2.5 px-0 w-full text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer resize-none"
            placeholder=" "
          ></textarea>
          <label className="absolute text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 pointer-events-none">
            توضیحات
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="col-span-full w-full py-3 bg-blue-500 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-600 transition duration-300"
        >
          ثبت سفارش
        </button>
      </form>
    </div>
  );
};

export default AddOrder;
