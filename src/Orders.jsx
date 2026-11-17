import { ToastContainer } from "react-toastify";
import { useDataContext } from "./Context/DataContext";
import OrdersMobile from "./OrdersMobile";
import Sell from "./Components/Sell";
import Buy from "./Components/Buy";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
const OrderList = () => {
  const { isMobile } = useDataContext();

  //Mobile View
  if (isMobile) {
    return <OrdersMobile />;
  }

  return (
    <div className="min-h-screen p-4 max-sm:p-0">
      <h1 className="text-center font-bold text-2xl bg-emerald-300 p-3 rounded-2xl shadow-md mb-4">
        {new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD")}
      </h1>
      <Sell />
      <Buy />
      <ToastContainer />
    </div>
  );
};

export default OrderList;
