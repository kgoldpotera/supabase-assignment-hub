import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Upload, FileText, Loader2, Check, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  due_date: string;
  created_by: string;
}

interface Submission {
  id: string;
  student_id: string;
  file_url: string | null;
  file_name: string | null;
  status: string;
  grade: string | null;
  feedback: string | null;
  submission_date: string | null;
  student_name?: string | null;
  student_email?: string;
}

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Grading dialog
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  const fetchData = async () => {
    if (!id || !user) return;

    // Fetch assignment
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .single();

    if (assignmentData) {
      setAssignment(assignmentData);

      // For teachers: fetch all submissions with student info
      if (role === "teacher" || role === "admin") {
        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", id);

        if (submissionsData) {
          // Fetch profiles for each submission
          const studentIds = submissionsData.map(s => s.student_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", studentIds);

          const submissionsWithProfiles = submissionsData.map(s => ({
            ...s,
            student_name: profilesData?.find(p => p.id === s.student_id)?.full_name,
            student_email: profilesData?.find(p => p.id === s.student_id)?.email,
          }));
          setSubmissions(submissionsWithProfiles);
        }
      }

      // For students: fetch their submission
      if (role === "student") {
        const { data: submissionData } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", id)
          .eq("student_id", user.id)
          .maybeSingle();

        if (submissionData) setMySubmission(submissionData);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, user, role]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user || !id) return;

    setUploading(true);
    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${user.id}/${id}/${Date.now()}.${fileExt}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(filePath, selectedFile);

    if (uploadError) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("submissions")
      .getPublicUrl(filePath);

    // Create or update submission
    const submissionData = {
      assignment_id: id,
      student_id: user.id,
      file_url: urlData.publicUrl,
      file_name: selectedFile.name,
      status: "submitted" as const,
      submission_date: new Date().toISOString(),
    };

    let error;
    if (mySubmission) {
      const { error: updateError } = await supabase
        .from("submissions")
        .update(submissionData)
        .eq("id", mySubmission.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("submissions")
        .insert(submissionData);
      error = insertError;
    }

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save submission. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Your assignment has been submitted!",
      });
      setSelectedFile(null);
      fetchData();
    }
    setUploading(false);
  };

  const handleSaveGrade = async () => {
    if (!gradingSubmission) return;

    setSavingGrade(true);
    const { error } = await supabase
      .from("submissions")
      .update({
        grade,
        feedback,
        status: "graded",
      })
      .eq("id", gradingSubmission.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save grade. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Grade saved successfully.",
      });
      setGradingSubmission(null);
      setGrade("");
      setFeedback("");
      fetchData();
    }
    setSavingGrade(false);
  };

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

  if (!assignment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Assignment not found.</p>
          <Button variant="link" onClick={() => navigate("/dashboard/assignments")}>
            Go back to assignments
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/assignments")}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Button>

        {/* Assignment Details */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-display">{assignment.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due {format(new Date(assignment.due_date), "MMMM d, yyyy 'at' h:mm a")}</span>
                </div>
              </div>
              {new Date(assignment.due_date) < new Date() && (
                <Badge variant="destructive">Past Due</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{assignment.description}</p>
              </div>
            )}
            {assignment.requirements && (
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{assignment.requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Submission Section */}
        {role === "student" && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Your Submission</CardTitle>
              <CardDescription>Upload your completed assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mySubmission && (
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{mySubmission.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted {mySubmission.submission_date && format(new Date(mySubmission.submission_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(mySubmission.status)}
                      {mySubmission.file_url && (
                        <a href={mySubmission.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  {mySubmission.status === "graded" && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid gap-2">
                        <div>
                          <span className="font-medium">Grade: </span>
                          <span className="text-primary font-semibold">{mySubmission.grade}</span>
                        </div>
                        {mySubmission.feedback && (
                          <div>
                            <span className="font-medium">Feedback: </span>
                            <span className="text-muted-foreground">{mySubmission.feedback}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">{mySubmission ? "Replace submission" : "Upload file"}</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted: PDF, DOC, DOCX, PNG, JPG, TXT (max 10MB)
                  </p>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{selectedFile.name}</span>
                    </div>
                    <Button onClick={handleSubmit} disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teacher Submissions View */}
        {(role === "teacher" || role === "admin") && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Student Submissions</CardTitle>
              <CardDescription>{submissions.length} submissions received</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No submissions yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                      <TableCell>
                          <div>
                            <p className="font-medium">{submission.student_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{submission.student_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.submission_date 
                            ? format(new Date(submission.submission_date), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>{submission.grade || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {submission.file_url && (
                            <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                View File
                              </Button>
                            </a>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              setGradingSubmission(submission);
                              setGrade(submission.grade || "");
                              setFeedback(submission.feedback || "");
                            }}
                          >
                            Grade
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Grading Dialog */}
        <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grade Submission</DialogTitle>
              <DialogDescription>
                Enter a grade and optional feedback for this submission.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., A+, 95%, Pass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback (optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback for the student..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGradingSubmission(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveGrade} disabled={savingGrade || !grade}>
                  {savingGrade ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Grade"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
