import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle, AlertCircle, BookMarked } from "lucide-react";
import { format } from "date-fns";

interface Unit {
  id: string;
  code: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  unit_id: string | null;
  units?: Unit | null;
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
  const [registeredUnits, setRegisteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch registered units
      const { data: regsData } = await supabase
        .from("unit_registrations")
        .select("unit_id, units(id, code, name)")
        .eq("student_id", user.id);

      if (regsData) {
        const units = regsData.map((r: any) => r.units).filter(Boolean);
        setRegisteredUnits(units);
      }

      const [assignmentsRes, submissionsRes] = await Promise.all([
        supabase.from("assignments").select("*, units(id, code, name)").order("due_date", { ascending: true }),
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
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
        <p className="text-muted-foreground mt-1">Track your units, assignments and submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered Units</CardTitle>
            <BookMarked className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{registeredUnits.length}</div>
            <p className="text-xs text-muted-foreground">enrolled courses</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">to submit</p>
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

      {/* Registered Units */}
      {registeredUnits.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Units</h2>
          <div className="flex flex-wrap gap-2">
            {registeredUnits.map((unit) => (
              <Badge key={unit.id} variant="outline" className="text-sm py-1.5 px-3">
                <span className="font-mono font-semibold mr-2">{unit.code}</span>
                {unit.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recent Assignments */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Assignments</h2>
        {assignments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {registeredUnits.length === 0 
                  ? "Register for units to see assignments" 
                  : "No assignments available yet"}
              </p>
              <Link to="/dashboard/units">
                <Button variant={registeredUnits.length === 0 ? "default" : "outline"}>
                  {registeredUnits.length === 0 ? "Browse Units" : "View All Units"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.slice(0, 6).map((assignment) => (
              <Link key={assignment.id} to={`/dashboard/assignments/${assignment.id}`}>
                <Card className="border-border hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      {assignment.units && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {assignment.units.code}
                        </Badge>
                      )}
                      {getStatusBadge(getSubmissionStatus(assignment.id))}
                    </div>
                    <CardTitle className="text-lg line-clamp-1 mt-2">{assignment.title}</CardTitle>
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
