/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useDataContext } from "../Context/DataContext";
import MobileLayout from "./MobileLayout";
import DesktopLayout from "./DesktopLayout";
function Layout() {
  const [show, setShow] = useState(false);
  const { isMobile, setIsMobile } = useDataContext();

  // ================= MOBILE =================
  if (isMobile) {
    return <MobileLayout show={show} setShow={setShow} />;
  }
  // ================= DESKTOP =================
  return <DesktopLayout />;
}

export default Layout;
