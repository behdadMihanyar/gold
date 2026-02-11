import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import LogIn from "./LogIn";
import Tasks from "./AddOrder";
import Layout from "./layout/Layout";
import Orders from "./Orders";
import AddOrder from "./AddOrder";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LogIn />} />

      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route path="/addOrder" element={<AddOrder />} />
      </Route>
    </Routes>
  );
}

export default App;
