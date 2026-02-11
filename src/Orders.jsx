import React, { useState, useEffect } from "react";
import supabase from "./supabase";

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    quantity: "",
    price: "",
    description: "",
    date: "",
    total: "",
    delivery: "",
    status: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order) => {
    setEditingId(order.id);
    setEditFormData({
      name: order.name,
      quantity: order.quantity,
      price: order.price,
      description: order.description || "",
      date: order.date,
      total: order.total,
      delivery: order.delivery || "",
      status: order.status || "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (name === "price") {
      const numericValue = value.replace(/\D/g, "");
      const formattedPrice = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "/");
      const quantity = editFormData.quantity;
      const price = numericValue;

      setEditFormData({
        ...editFormData,
        price: formattedPrice,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      });
    } else if (name === "quantity") {
      const quantity = value;
      const price = editFormData.price.replace(/\D/g, "");

      setEditFormData({
        ...editFormData,
        quantity: value,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      });
    } else {
      setEditFormData({ ...editFormData, [name]: value });
    }
  };

  const handleUpdate = async (id) => {
    const { error } = await supabase
      .from("tasks")
      .update(editFormData)
      .eq("id", id);

    if (error) {
      alert("Error updating order: " + error.message);
    } else {
      setOrders(
        orders.map((order) =>
          order.id === id ? { ...order, ...editFormData } : order
        )
      );
      setEditingId(null);
      alert("Order updated successfully!");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({
      name: "",
      quantity: "",
      price: "",
      description: "",
      date: "",
      total: "",
      delivery: "",
      status: "",
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) {
        alert("Error deleting order: " + error.message);
      } else {
        setOrders(orders.filter((order) => order.id !== id));
        alert("Order deleted successfully!");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-2xl text-gray-600">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-2xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          لیست سفارشات
        </h2>

        {orders.length === 0 ? (
          <div className="bg-white shadow-xl rounded-2xl p-12 text-center">
            <p className="text-xl text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      نام
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      تعداد
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      نرخ
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      جمع کل
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      تاریخ
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      تحویل دهنده
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      توضیحات
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      وضعیت
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50 transition-colors duration-200`}
                    >
                      {editingId === order.id ? (
                        <>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="text"
                              name="name"
                              value={editFormData.name}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="text"
                              name="quantity"
                              value={editFormData.quantity}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="text"
                              name="price"
                              value={editFormData.price}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="text"
                              name="total"
                              value={editFormData.total}
                              readOnly
                              className="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm text-center cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="date"
                              name="date"
                              value={editFormData.date}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="text"
                              name="delivery"
                              value={editFormData.delivery}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="text"
                              name="description"
                              value={editFormData.description}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <select name="status" onChange={handleEditChange}>
                              <option value="در انتظار">در انتظار</option>
                              <option value="در حال ارسال">در حال ارسال</option>
                              <option value="تحویل شده">تحویل شده</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleUpdate(order.id)}
                                className="text-green-500 hover:text-green-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-green-50"
                                title="Save"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-gray-500 hover:text-gray-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-200"
                                title="Cancel"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {order.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm text-gray-900">
                              {order.quantity}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm text-gray-900">
                              {order.price}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm font-semibold text-blue-600">
                              {order.total}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm text-gray-900">
                              {new Date(order.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm text-gray-900">
                              {order.delivery || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm text-gray-900">
                              {order.description || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm text-gray-900">
                              {order.status || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(order)}
                                className="text-blue-500 hover:text-blue-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-blue-50"
                                title="Edit"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(order.id)}
                                className="text-red-500 hover:text-red-700 transition-colors inline-flex items-center justify-center p-2 rounded-lg hover:bg-red-50"
                                title="Delete"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
