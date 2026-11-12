import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import LogIn from "./LogIn";
import Layout from "./layout/Layout";
import Orders from "./Orders";
import AddOrder from "./AddOrder";
import Search from "./Components/Search";
import Sms from "./Components/Sms";
import Home from "./Components/Home";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LogIn />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/addOrder" element={<AddOrder />} />
        <Route path="/search" element={<Search />} />
        <Route path="/sms" element={<Sms />} />
        <Route path="/home" element={<Home />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
