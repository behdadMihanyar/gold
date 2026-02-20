//Handle Change
export const handleChangeBuy = (e, formDataBuy, setformDataBuy) => {
  const { name, value } = e.target;

  setformDataBuy((prev) => {
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
export const handleDateChangeBuy = (
  date,
  setformDataBuy,
  setCalendarVisibleBuy,
  persian,
) => {
  setformDataBuy((prev) => ({
    ...prev,
    date: date.format("YYYY/MM/DD", { calendar: persian }),
  }));

  if (setCalendarVisibleBuy) {
    setCalendarVisibleBuy(false);
  }
};

//handle submit
export const handleSubmitBuy = async (
  e,
  formDataBuy,
  setformDataBuy,
  supabase,
  toast,
) => {
  e.preventDefault();

  const { error } = await supabase.from("buy").insert(formDataBuy);

  if (error) {
    console.log(error.message);
  } else {
    setformDataBuy({
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
