import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const AppLayout = () => (
  <ProtectedRoute>
    <Navbar />
    <Outlet />
  </ProtectedRoute>
);
