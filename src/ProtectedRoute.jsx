import { Navigate } from "react-router-dom";
import { useAuth } from "./Context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  console.log(user);
  if (loading) return <p>Loading...</p>;

  return user ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
