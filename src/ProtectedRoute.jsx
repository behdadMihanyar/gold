import { Navigate } from "react-router-dom";
import { useAuth } from "./Context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  return user ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
