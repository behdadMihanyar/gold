import { createContext, useContext, useEffect, useState } from "react";
const DataContext = createContext();

export function DataProvider({ children }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 558);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalCountBuy,setTotalCountBuy] = useState(0);
  const [pagebuy,setPagebuy] = useState(1);
 

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 558);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <DataContext.Provider
      value={{
        isMobile,
        setIsMobile,
        totalCount,
        setTotalCount,
        page,
        setPage,
        totalCountBuy,
        setTotalCountBuy,
        pagebuy,
        setPagebuy,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useDataContext = () => useContext(DataContext);
