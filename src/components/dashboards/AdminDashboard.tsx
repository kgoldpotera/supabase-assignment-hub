import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, BookOpen, FileText, Shield, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stats, setStats] = useState({ users: 0, assignments: 0, submissions: 0 });
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    // Fetch all profiles with their roles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (profiles && roles) {
      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "student",
        };
      });
      setUsers(usersWithRoles);
    }

    // Fetch stats
    const [assignmentsCount, submissionsCount] = await Promise.all([
      supabase.from("assignments").select("id", { count: "exact", head: true }),
      supabase.from("submissions").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      users: profiles?.length || 0,
      assignments: assignmentsCount.count || 0,
      submissions: submissionsCount.count || 0,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const promoteToTeacher = async (userId: string) => {
    setPromotingId(userId);
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: "teacher" })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to promote user. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User has been promoted to Teacher.",
      });
      fetchData();
    }
    
    setPromotingId(null);
  };

  const demoteToStudent = async (userId: string) => {
    setPromotingId(userId);
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: "student" })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to demote user. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User has been demoted to Student.",
      });
      fetchData();
    }
    
    setPromotingId(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-destructive text-destructive-foreground">Admin</Badge>;
      case "teacher":
        return <Badge className="bg-primary text-primary-foreground">Teacher</Badge>;
      default:
        return <Badge variant="secondary">Student</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-destructive" />
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Manage users and system settings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">registered accounts</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.assignments}</div>
            <p className="text-xs text-muted-foreground">total created</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.submissions}</div>
            <p className="text-xs text-muted-foreground">files submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage user roles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || "No name"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-right">
                    {user.role === "student" && (
                      <Button
                        size="sm"
                        onClick={() => promoteToTeacher(user.id)}
                        disabled={promotingId === user.id}
                      >
                        {promotingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Promote to Teacher"
                        )}
                      </Button>
                    )}
                    {user.role === "teacher" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => demoteToStudent(user.id)}
                        disabled={promotingId === user.id}
                      >
                        {promotingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Demote to Student"
                        )}
                      </Button>
                    )}
                    {user.role === "admin" && (
                      <span className="text-sm text-muted-foreground">Superadmin</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
