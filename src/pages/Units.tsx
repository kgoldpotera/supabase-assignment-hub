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
import { BookMarked, Plus, Users, Loader2, Check, X } from "lucide-react";

interface Unit {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface Registration {
  unit_id: string;
}

export default function Units() {
  const { user, role } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchData = async () => {
    if (!user) return;

    let query = supabase.from("units").select("*").order("code", { ascending: true });
    
    // Teachers only see their own units
    if (role === "teacher") {
      query = query.eq("created_by", user.id);
    }

    const { data: unitsData } = await query;
    if (unitsData) setUnits(unitsData);

    // Fetch student registrations
    if (role === "student") {
      const { data: regsData } = await supabase
        .from("unit_registrations")
        .select("unit_id")
        .eq("student_id", user.id);
      if (regsData) setRegistrations(regsData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    const { error } = await supabase.from("units").insert({
      code: code.toUpperCase(),
      name,
      description,
      created_by: user.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate") 
          ? "A unit with this code already exists." 
          : "Failed to create unit. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Unit created successfully.",
      });
      setCreateOpen(false);
      setCode("");
      setName("");
      setDescription("");
      fetchData();
    }
    setCreating(false);
  };

  const handleRegister = async (unitId: string) => {
    if (!user) return;

    setRegisteringId(unitId);
    const isRegistered = registrations.some((r) => r.unit_id === unitId);

    if (isRegistered) {
      const { error } = await supabase
        .from("unit_registrations")
        .delete()
        .eq("unit_id", unitId)
        .eq("student_id", user.id);

      if (error) {
        toast({ title: "Error", description: "Failed to unregister.", variant: "destructive" });
      } else {
        toast({ title: "Unregistered", description: "You have been unregistered from this unit." });
        fetchData();
      }
    } else {
      const { error } = await supabase.from("unit_registrations").insert({
        unit_id: unitId,
        student_id: user.id,
      });

      if (error) {
        toast({ title: "Error", description: "Failed to register.", variant: "destructive" });
      } else {
        toast({ title: "Registered!", description: "You are now enrolled in this unit." });
        fetchData();
      }
    }
    setRegisteringId(null);
  };

  const isRegistered = (unitId: string) => registrations.some((r) => r.unit_id === unitId);
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
            <h1 className="text-3xl font-display font-bold text-foreground">Units</h1>
            <p className="text-muted-foreground mt-1">
              {isTeacherOrAdmin ? "Manage your course units" : "Browse and register for units"}
            </p>
          </div>
          {isTeacherOrAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Unit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Unit</DialogTitle>
                  <DialogDescription>
                    Add a new course unit for students to register.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Unit Code</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g., CS101"
                      required
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Unit Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Introduction to Computer Science"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this unit covers..."
                      rows={3}
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
                        "Create Unit"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {units.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookMarked className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {isTeacherOrAdmin
                  ? "No units created yet. Create your first one!"
                  : "No units available yet."}
              </p>
              {isTeacherOrAdmin && (
                <Button onClick={() => setCreateOpen(true)}>Create Unit</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map((unit) => (
              <Card key={unit.id} className="border-border hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-primary font-mono">
                      {unit.code}
                    </Badge>
                    {role === "student" && isRegistered(unit.id) && (
                      <Badge className="bg-green-600 text-white">Enrolled</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">{unit.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {unit.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {role === "student" && (
                    <Button
                      variant={isRegistered(unit.id) ? "outline" : "default"}
                      className="w-full"
                      onClick={() => handleRegister(unit.id)}
                      disabled={registeringId === unit.id}
                    >
                      {registeringId === unit.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isRegistered(unit.id) ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Unregister
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Register
                        </>
                      )}
                    </Button>
                  )}
                  {isTeacherOrAdmin && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Your unit</span>
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
