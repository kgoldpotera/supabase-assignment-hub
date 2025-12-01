import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, FileText, Plus, BookMarked } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

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
  created_at: string;
  unit_id: string | null;
  units?: Unit | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  status: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch teacher's units
      const { data: unitsData } = await supabase
        .from("units")
        .select("id, code, name")
        .eq("created_by", user.id)
        .order("code");

      if (unitsData) setUnits(unitsData);

      const assignmentsRes = await supabase
        .from("assignments")
        .select("*, units(id, code, name)")
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your units, assignments and review submissions</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/units">
            <Button variant="outline" className="gap-2">
              <BookMarked className="h-4 w-4" />
              Units
            </Button>
          </Link>
          <Link to="/dashboard/assignments">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Units</CardTitle>
            <BookMarked className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{units.length}</div>
            <p className="text-xs text-muted-foreground">courses created</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">total created</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
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

      {/* Your Units */}
      {units.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Units</h2>
          <div className="flex flex-wrap gap-2">
            {units.map((unit) => (
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
                {units.length === 0 
                  ? "Create a unit first, then add assignments" 
                  : "No assignments created yet"}
              </p>
              <Link to={units.length === 0 ? "/dashboard/units" : "/dashboard/assignments"}>
                <Button>{units.length === 0 ? "Create Unit" : "Create Assignment"}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.slice(0, 6).map((assignment) => (
              <Link key={assignment.id} to={`/dashboard/assignments/${assignment.id}`}>
                <Card className="border-border hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      {assignment.units && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {assignment.units.code}
                        </Badge>
                      )}
                      <Badge variant="secondary">{getSubmissionCount(assignment.id)} submissions</Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-1 mt-2">{assignment.title}</CardTitle>
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
