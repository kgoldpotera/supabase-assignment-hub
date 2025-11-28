import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface SubmissionWithAssignment {
  id: string;
  assignment_id: string;
  file_url: string | null;
  file_name: string | null;
  status: string;
  grade: string | null;
  feedback: string | null;
  submission_date: string | null;
  assignments: {
    title: string;
    due_date: string;
  } | null;
}

export default function Submissions() {
  const { user, role } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user) return;

      let query = supabase
        .from("submissions")
        .select("*, assignments(title, due_date)")
        .order("submission_date", { ascending: false });

      // Students only see their own submissions
      if (role === "student") {
        query = query.eq("student_id", user.id);
      }

      const { data } = await query;
      if (data) setSubmissions(data);
      setLoading(false);
    };

    fetchSubmissions();
  }, [user, role]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-primary text-primary-foreground">Submitted</Badge>;
      case "graded":
        return <Badge className="bg-green-600 text-white">Graded</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

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
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Submissions</h1>
          <p className="text-muted-foreground mt-1">Track all your assignment submissions</p>
        </div>

        {submissions.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No submissions yet</p>
              <Link to="/dashboard/assignments">
                <Button>View Assignments</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id} className="border-border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {submission.assignments?.title || "Unknown Assignment"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Submitted {submission.submission_date && format(new Date(submission.submission_date), "MMMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(submission.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{submission.file_name || "No file"}</span>
                      </div>
                      {submission.file_url && (
                        <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View File
                          </Button>
                        </a>
                      )}
                    </div>
                    <Link to={`/dashboard/assignments/${submission.assignment_id}`}>
                      <Button variant="ghost" size="sm">View Assignment</Button>
                    </Link>
                  </div>

                  {submission.status === "graded" && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid gap-2">
                        <div>
                          <span className="font-medium">Grade: </span>
                          <span className="text-primary font-semibold">{submission.grade}</span>
                        </div>
                        {submission.feedback && (
                          <div>
                            <span className="font-medium">Feedback: </span>
                            <span className="text-muted-foreground">{submission.feedback}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
