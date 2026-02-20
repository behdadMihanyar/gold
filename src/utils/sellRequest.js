//Handle Change
export const handleChange = (e, formData, setFormData) => {
  const { name, value } = e.target;

  setFormData((prev) => {
    if (name === "price") {
      const numericValue = value.replace(/\D/g, "");
      const formattedPrice = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "/");

      const quantity = prev.quantity;
      const price = numericValue;

      return {
        ...prev,
        price: formattedPrice,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      };
    }

    if (name === "quantity") {
      const quantity = value;
      const price = prev.price.replace(/\D/g, "");

      return {
        ...prev,
        quantity: value,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      };
    }

    return { ...prev, [name]: value };
  });
};
//handle Date
export const handleDateChange = (
  date,
  setFormData,
  setCalendarVisible,
  persian,
) => {
  setFormData((prev) => ({
    ...prev,
    date: date.format("YYYY/MM/DD", { calendar: persian }),
  }));

  if (setCalendarVisible) {
    setCalendarVisible(false);
  }
};

//handle submit
export const handleSubmit = async (
  e,
  formData,
  setFormData,
  supabase,
  toast,
) => {
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

    toast.success("سفارش با موفقیت ثبت شد", {
      position: "top-left",
      style: { fontSize: "18px" },
    });
  }
};
