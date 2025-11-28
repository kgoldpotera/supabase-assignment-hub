import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {role === "admin" && <AdminDashboard />}
      {role === "teacher" && <TeacherDashboard />}
      {role === "student" && <StudentDashboard />}
    </DashboardLayout>
  );
}
