import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, Plus, Clock, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  due_date: string;
  created_by: string;
  created_at: string;
}

export default function Assignments() {
  const { user, role } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [dueDate, setDueDate] = useState("");

  const fetchAssignments = async () => {
    let query = supabase.from("assignments").select("*").order("due_date", { ascending: true });
    
    // Teachers only see their own assignments
    if (role === "teacher" && user) {
      query = query.eq("created_by", user.id);
    }

    const { data, error } = await query;
    if (data) setAssignments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, [user, role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    const { error } = await supabase.from("assignments").insert({
      title,
      description,
      requirements,
      due_date: new Date(dueDate).toISOString(),
      created_by: user.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Assignment created successfully.",
      });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setRequirements("");
      setDueDate("");
      fetchAssignments();
    }
    setCreating(false);
  };

  const isPastDue = (dueDate: string) => new Date(dueDate) < new Date();
  const isTeacherOrAdmin = role === "teacher" || role === "admin";

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Assignments</h1>
            <p className="text-muted-foreground mt-1">
              {isTeacherOrAdmin ? "Manage your assignments" : "View and submit assignments"}
            </p>
          </div>
          {isTeacherOrAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Assignment</DialogTitle>
                  <DialogDescription>
                    Add a new assignment for students to complete.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Assignment title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the assignment..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="List the requirements..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Assignment"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {assignments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {isTeacherOrAdmin 
                  ? "No assignments created yet. Create your first one!" 
                  : "No assignments available yet."}
              </p>
              {isTeacherOrAdmin && (
                <Button onClick={() => setCreateOpen(true)}>Create Assignment</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <Link 
                key={assignment.id} 
                to={`/dashboard/assignments/${assignment.id}`}
                className="block"
              >
                <Card className="border-border hover:shadow-lg transition-all hover:border-primary/50 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-1">{assignment.title}</CardTitle>
                      {isPastDue(assignment.due_date) && (
                        <Badge variant="destructive">Past Due</Badge>
                      )}
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
                        Due {format(new Date(assignment.due_date), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
