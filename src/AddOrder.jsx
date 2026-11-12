import React, { useState } from "react";
import { Calendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { ToastContainer } from "react-toastify";
import CreatableSelect from "react-select/creatable";
import {
  buyHandlers,
  emptyOrderForm,
  handleFormChange,
  handleFormDateChange,
  sellHandlers,
} from "./utils/orderHandlers.js";

import { defaultNames } from "./Customers/Customers.js";

const AddOrder = () => {
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: "transparent",
      border: "0",
      borderBottom: "2px solid #D1D5DB",
      borderRadius: "0",
      minHeight: "42px",
      boxShadow: "none",
      padding: "2px 0",
      "&:hover": {
        borderBottom: "2px solid #3B82F6",
      },
    }),
    indicatorSeparator: () => ({ display: "none" }),
    menu: (provided) => ({ ...provided, zIndex: 9999 }),
  };

  // فروش
  const [formData, setFormData] = useState(emptyOrderForm);

  // خرید
  const [formDataBuy, setFormDataBuy] = useState(emptyOrderForm);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarVisibleBuy, setCalendarVisibleBuy] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 px-4 sm:px-6 max-sm:mt-10 lg:px-10 py-6">
      {/* ================= SELL FORM ================= */}
      <div className="w-full lg:w-1/2 flex justify-center">
        <form
          onSubmit={(e) =>
            sellHandlers.handleSubmit(e, formData, setFormData)
          }
          className="bg-white shadow-xl rounded-2xl p-4 sm:p-6 w-full max-w-xl lg:max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 col-span-full text-center">
            ثبت سفارش فروش
          </h2>

          {/* Name */}
          <div className="w-full">
            <CreatableSelect
              styles={customStyles}
              options={defaultNames}
              value={
                formData.name
                  ? { value: formData.name, label: formData.name }
                  : null
              }
              onChange={(selectedOption) =>
                setFormData({
                  ...formData,
                  name: selectedOption ? selectedOption.value : "",
                })
              }
              placeholder="نام"
              isClearable
            />
          </div>

          <InputField
            label="تعداد"
            name="quantity"
            inputMode="numeric"
            value={formData.quantity}
            onChange={(e) => handleFormChange(e, setFormData)}
            required
          />

          <InputField
            label="نرخ"
            name="price"
            value={formData.price}
            onChange={(e) => handleFormChange(e, setFormData)}
            required
          />

          <ReadOnlyField label="جمع کل" value={formData.total} />

          {/* Date */}
          <div className="w-full relative">
            <div
              onClick={() => setCalendarVisible(!calendarVisible)}
              className="cursor-pointer py-2.5 border-b-2 border-gray-300 text-gray-400"
            >
              {formData.date || "تاریخ"}
            </div>

            {calendarVisible && (
              <div className="absolute z-50 mt-2 scale-90 sm:scale-100 origin-top">
                <Calendar
                  calendar={persian}
                  locale={persian_fa}
                  value={formData.date}
                  onChange={(date) =>
                    handleFormDateChange(date, setFormData, setCalendarVisible)
                  }
                />
              </div>
            )}
          </div>

          <InputField
            label="تحویل دهنده"
            name="delivery"
            value={formData.delivery}
            onChange={(e) => handleFormChange(e, setFormData)}
          />

          <div className="col-span-full">
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => handleFormChange(e, setFormData)}
              rows="2"
              placeholder="توضیحات"
              className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none resize-none py-2 placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            className="col-span-full w-full py-3 hover:cursor-pointer bg-indigo-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition duration-300"
          >
            ثبت سفارش
          </button>
        </form>
      </div>

      {/* ================= BUY FORM ================= */}
      <div className="w-full lg:w-1/2 flex justify-center">
        <form
          onSubmit={(e) =>
            buyHandlers.handleSubmit(e, formDataBuy, setFormDataBuy)
          }
          className="bg-white shadow-xl rounded-2xl p-4 sm:p-6 w-full max-w-xl lg:max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 col-span-full text-center">
            ثبت سفارش خرید
          </h2>

          <div className="w-full">
            <CreatableSelect
              styles={customStyles}
              options={defaultNames}
              value={
                formDataBuy.name
                  ? { value: formDataBuy.name, label: formDataBuy.name }
                  : null
              }
              onChange={(selectedOption) =>
                setFormDataBuy({
                  ...formDataBuy,
                  name: selectedOption ? selectedOption.value : "",
                })
              }
              placeholder="نام"
              isClearable
            />
          </div>

          <InputField
            label="تعداد"
            name="quantity"
            inputMode="numeric"
            value={formDataBuy.quantity}
            onChange={(e) => handleFormChange(e, setFormDataBuy)}
            required
          />

          <InputField
            label="نرخ"
            name="price"
            value={formDataBuy.price}
            onChange={(e) => handleFormChange(e, setFormDataBuy)}
            required
          />

          <ReadOnlyField label="جمع کل" value={formDataBuy.total} />

          <div className="w-full relative">
            <div
              onClick={() => setCalendarVisibleBuy(!calendarVisibleBuy)}
              className="cursor-pointer py-2.5 border-b-2 border-gray-300 text-gray-400"
            >
              {formDataBuy.date || "تاریخ"}
            </div>

            {calendarVisibleBuy && (
              <div className="absolute z-50 mt-2 scale-90 sm:scale-100 origin-top">
                <Calendar
                  calendar={persian}
                  locale={persian_fa}
                  value={formDataBuy.date}
                  onChange={(date) =>
                    handleFormDateChange(date, setFormDataBuy, setCalendarVisibleBuy)
                  }
                />
              </div>
            )}
          </div>

          <InputField
            label="تحویل دهنده"
            name="delivery"
            value={formDataBuy.delivery}
            onChange={(e) => handleFormChange(e, setFormDataBuy)}
          />

          <div className="col-span-full">
            <textarea
              name="description"
              value={formDataBuy.description}
              onChange={(e) => handleFormChange(e, setFormDataBuy)}
              rows="2"
              placeholder="توضیحات"
              className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none resize-none py-2 placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            className="col-span-full w-full py-3 hover:cursor-pointer bg-indigo-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition duration-300"
          >
            ثبت سفارش
          </button>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
};

/* ================= Reusable Components ================= */

const InputField = ({ label, ...props }) => (
  <div className="w-full">
    <input
      {...props}
      placeholder={label}
      className="block w-full py-2.5 border-b-2 border-gray-300 
                 focus:border-blue-500 outline-none bg-transparent 
                 placeholder-gray-400"
    />
  </div>
);

const ReadOnlyField = ({ label, value }) => (
  <div className="w-full">
    <input
      value={value}
      readOnly
      placeholder={label}
      className="block w-full py-2.5 border-b-2 border-gray-300 
                 bg-gray-100 text-gray-500 outline-none 
                 placeholder-gray-400"
    />
  </div>
);

export default AddOrder;
