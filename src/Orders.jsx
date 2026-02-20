import React, { useState, useEffect } from "react";
import supabase from "./supabase";

import { ToastContainer, toast } from "react-toastify";
import gold from "./img/gold.png";
import { useDataContext } from "./Context/DataContext";
import OrdersMobile from "./OrdersMobile";
import { GrLinkNext, GrLinkPrevious } from "react-icons/gr";
import {
  handleCancel,
  handleDelete,
  handleEdit,
  handleEditChange,
  handleUpdate,
} from "./utils/sellUpdate";
import Sell from "./Components/Sell";
import Buy from "./Components/Buy";
import Gold from "./Components/Gold";
const OrderList = () => {
  const { isMobile } = useDataContext();

  //Mobile View
  if (isMobile) {
    return <OrdersMobile />;
  }

  return (
    <div className="min-h-screen p-4 max-sm:p-0">
      <Gold />
      <Sell />
      <Buy />
      <ToastContainer />
    </div>
  );
};

export default OrderList;
