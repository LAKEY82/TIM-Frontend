"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteProject } from "@/hooks/queries/use-projects";
import { getErrorMessage } from "@/lib/api";
import type { Project } from "@/types/domain";

/** Permanent delete: the project's name must be typed to confirm. */
export function ProjectDeleteDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const remove = useDeleteProject();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === project.name.trim();

  const close = (next: boolean) => {
    if (remove.isPending) return;
    if (!next) {
      setTyped("");
      setError(null);
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    setError(null);
    try {
      await remove.mutateAsync(project.id);
      onOpenChange(false);
      router.push("/projects");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            This permanently deletes <span className="font-medium text-foreground">{project.name}</span> with its {project.taskCount} task
            {project.taskCount === 1 ? "" : "s"}, subtasks, milestones, comments and attachments. It can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <div className="grid gap-1.5">
          <Label htmlFor="delete-project-name">
            Type <span className="font-semibold">{project.name}</span> to confirm
          </Label>
          <Input
            id="delete-project-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            onKeyDown={(e) => e.key === "Enter" && matches && void confirm()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={!matches || remove.isPending}>
            {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
