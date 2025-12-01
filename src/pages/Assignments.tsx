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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Clock, AlertCircle, Loader2 } from "lucide-react";
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
  requirements: string | null;
  due_date: string;
  created_by: string;
  created_at: string;
  unit_id: string | null;
  units?: Unit | null;
}

export default function Assignments() {
  const { user, role } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [unitId, setUnitId] = useState<string>("");

  const fetchData = async () => {
    if (!user) return;

    // Fetch units for teacher to select from
    if (role === "teacher" || role === "admin") {
      const { data: unitsData } = await supabase
        .from("units")
        .select("id, code, name")
        .eq("created_by", user.id)
        .order("code");
      if (unitsData) setUnits(unitsData);
    }

    // Fetch assignments with unit info
    let query = supabase
      .from("assignments")
      .select("*, units(id, code, name)")
      .order("due_date", { ascending: true });
    
    // Teachers only see their own assignments
    if (role === "teacher") {
      query = query.eq("created_by", user.id);
    }

    const { data } = await query;
    if (data) setAssignments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!unitId) {
      toast({
        title: "Unit Required",
        description: "Please select a unit for this assignment.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("assignments").insert({
      title,
      description,
      requirements,
      due_date: new Date(dueDate).toISOString(),
      created_by: user.id,
      unit_id: unitId,
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
      setUnitId("");
      fetchData();
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
                    <Label htmlFor="unit">Unit *</Label>
                    <Select value={unitId} onValueChange={setUnitId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No units created yet. Create a unit first.
                          </div>
                        ) : (
                          units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.code} - {unit.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
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
                    <Label htmlFor="due_date">Due Date *</Label>
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
                    <Button type="submit" disabled={creating || units.length === 0}>
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
                  : role === "student" 
                    ? "No assignments available. Register for units to see assignments."
                    : "No assignments available yet."}
              </p>
              {isTeacherOrAdmin && (
                <Button onClick={() => setCreateOpen(true)}>Create Assignment</Button>
              )}
              {role === "student" && (
                <Link to="/dashboard/units">
                  <Button>Browse Units</Button>
                </Link>
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
                    <div className="flex items-start justify-between gap-2">
                      {assignment.units && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {assignment.units.code}
                        </Badge>
                      )}
                      {isPastDue(assignment.due_date) && (
                        <Badge variant="destructive">Past Due</Badge>
                      )}
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
