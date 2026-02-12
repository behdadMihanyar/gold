import { createContext, useContext, useEffect, useState } from "react";
const DataContext = createContext();

export function DataProvider({ children }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 558);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 558);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <DataContext.Provider value={{ isMobile, setIsMobile }}>
      {children}
    </DataContext.Provider>
  );
}

export const useDataContext = () => useContext(DataContext);
