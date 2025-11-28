import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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

export default function StudentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [assignmentsRes, submissionsRes] = await Promise.all([
        supabase.from("assignments").select("*").order("due_date", { ascending: true }),
        supabase.from("submissions").select("*").eq("student_id", user.id),
      ]);

      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (submissionsRes.data) setSubmissions(submissionsRes.data);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getSubmissionStatus = (assignmentId: string) => {
    const submission = submissions.find((s) => s.assignment_id === assignmentId);
    return submission?.status || "pending";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-primary text-primary-foreground">Submitted</Badge>;
      case "graded":
        return <Badge className="bg-green-600 text-white">Graded</Badge>;
      default:
        return <Badge variant="secondary">Not Submitted</Badge>;
    }
  };

  const isPastDue = (dueDate: string) => new Date(dueDate) < new Date();

  const pendingCount = assignments.filter(
    (a) => getSubmissionStatus(a.id) === "pending" && !isPastDue(a.due_date)
  ).length;
  
  const submittedCount = submissions.filter((s) => s.status === "submitted").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;

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
        <h1 className="text-3xl font-display font-bold text-foreground">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your assignments and submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">assignments to submit</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gradedCount}</div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Assignments</h2>
        {assignments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assignments available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.slice(0, 6).map((assignment) => (
              <Card key={assignment.id} className="border-border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{assignment.title}</CardTitle>
                    {getStatusBadge(getSubmissionStatus(assignment.id))}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {assignment.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    {isPastDue(assignment.due_date) ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={isPastDue(assignment.due_date) ? "text-destructive" : "text-muted-foreground"}>
                      Due {format(new Date(assignment.due_date), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
