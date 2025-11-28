import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

export default function AdminPanel() {
  const { role, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <AdminDashboard />
    </DashboardLayout>
  );
}
