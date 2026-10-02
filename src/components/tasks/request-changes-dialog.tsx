"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRequestChanges } from "@/hooks/queries/use-tasks";
import { applyServerErrors } from "@/lib/forms";
import type { ID } from "@/types/domain";

const schema = z.object({
  feedback: z.string().trim().min(5, "Describe what needs to change (at least 5 characters).").max(4000),
});
type Values = z.infer<typeof schema>;

interface RequestChangesDialogProps {
  taskId: ID;
  taskTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Reviewer feedback is stored by the API as part of the task's review history. */
export function RequestChangesDialog({ taskId, taskTitle, open, onOpenChange }: RequestChangesDialogProps) {
  const mutation = useRequestChanges();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { feedback: "" } });
  const error = form.formState.errors.feedback?.message;

  const onSubmit = form.handleSubmit(async ({ feedback }) => {
    setFormError(null);
    try {
      await mutation.mutateAsync({ id: taskId, feedback });
      form.reset();
      onOpenChange(false);
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError, ["feedback"]));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          setFormError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Explain what needs to change in <span className="font-medium text-foreground">{taskTitle}</span>. The assignee will be notified.
            </DialogDescription>
          </DialogHeader>
          <FormError message={formError} />
          <FormField id="feedback" label="Reason / feedback" error={error} required>
            <Textarea
              id="feedback"
              rows={5}
              autoFocus
              placeholder="e.g. The checkout API should validate the coupon before calculating totals."
              aria-invalid={Boolean(error)}
              aria-describedby={fieldDescribedBy("feedback", error)}
              {...form.register("feedback")}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
              Submit feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
