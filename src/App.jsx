import { Routes, Route } from "react-router-dom";
import SessionControl from "./SessionControl";
import ProtectedRoute from "./ProtectedRoute";
import LogIn from "./LogIn";
import Tasks from "./AddOrder";
import Layout from "./layout/Layout";
import Orders from "./Orders";
import AddOrder from "./AddOrder";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Orders />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/addOrder" element={<AddOrder />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
