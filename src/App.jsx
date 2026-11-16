import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./Context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import LogIn from "./LogIn";
import Layout from "./layout/Layout";
import Orders from "./Orders";
import AddOrder from "./AddOrder";
import Search from "./Components/Search";
import Sms from "./Components/Sms";
import Home from "./Components/Home";
import PanelLayout from "./panel/PanelLayout";
import Market from "./panel/Market";
import MyRequests from "./panel/MyRequests";
import AdminRequests from "./admin/Requests";
import AdminCustomers from "./admin/Customers";
import AdminPrices from "./admin/Prices";
import AdminCollector from "./admin/Collector";

const ByRole = ({ admin, customer }) => {
  const { user } = useAuth();
  return user.role === "admin" ? admin : customer;
};
const AdminOnly = ({ children }) => <ByRole admin={children} customer={<Navigate to="/" replace />} />;

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LogIn />} />
      <Route
        element={
          <ProtectedRoute>
            <ByRole admin={<Layout />} customer={<PanelLayout />} />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ByRole admin={<Home />} customer={<Market />} />} />
        <Route path="/requests" element={<ByRole admin={<AdminRequests />} customer={<MyRequests />} />} />
        <Route path="/home" element={<AdminOnly><Home /></AdminOnly>} />
        <Route path="/orders" element={<AdminOnly><Orders /></AdminOnly>} />
        <Route path="/addOrder" element={<AdminOnly><AddOrder /></AdminOnly>} />
        <Route path="/search" element={<AdminOnly><Search /></AdminOnly>} />
        <Route path="/sms" element={<AdminOnly><Sms /></AdminOnly>} />
        <Route path="/customers" element={<AdminOnly><AdminCustomers /></AdminOnly>} />
        <Route path="/prices" element={<AdminOnly><AdminPrices /></AdminOnly>} />
        <Route path="/collector" element={<AdminOnly><AdminCollector /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
