import { Outlet } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function PhotoStudioLayout() {
  return (
    <div className="photostudio-marketing min-h-screen">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
