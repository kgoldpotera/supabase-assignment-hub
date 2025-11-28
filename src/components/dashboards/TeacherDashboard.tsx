import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  status: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const assignmentsRes = await supabase
        .from("assignments")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (assignmentsRes.data) {
        setAssignments(assignmentsRes.data);
        
        // Fetch submissions for teacher's assignments
        const assignmentIds = assignmentsRes.data.map((a) => a.id);
        if (assignmentIds.length > 0) {
          const submissionsRes = await supabase
            .from("submissions")
            .select("*")
            .in("assignment_id", assignmentIds);
          
          if (submissionsRes.data) setSubmissions(submissionsRes.data);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getSubmissionCount = (assignmentId: string) => {
    return submissions.filter((s) => s.assignment_id === assignmentId).length;
  };

  const pendingReview = submissions.filter((s) => s.status === "submitted").length;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your assignments and review submissions</p>
        </div>
        <Link to="/dashboard/assignments">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Assignment
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">total created</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">from students</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Users className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingReview}</div>
            <p className="text-xs text-muted-foreground">to grade</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Assignments</h2>
        {assignments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No assignments created yet</p>
              <Link to="/dashboard/assignments">
                <Button>Create Your First Assignment</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.slice(0, 6).map((assignment) => (
              <Card key={assignment.id} className="border-border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{assignment.title}</CardTitle>
                    <Badge variant="outline">{getSubmissionCount(assignment.id)} submissions</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {assignment.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Due {format(new Date(assignment.due_date), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
