import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supabase";
const DataContext = createContext();

export function DataProvider({ children }) {
  const [order, setOrder] = useState;

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
