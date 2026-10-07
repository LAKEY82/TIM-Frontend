"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ID } from "@/types/domain";
import { TaskDetails } from "./task-details";

/**
 * Opens a task beside the list (like ClickUp's task panel) so the user keeps
 * their place. The full page is one click away.
 */
export function TaskDrawer({ taskId, onOpenChange }: { taskId: ID | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={Boolean(taskId)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-4xl">
        <SheetHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur">
          <div>
            <SheetTitle className="text-sm">Task</SheetTitle>
            <SheetDescription className="sr-only">Task details</SheetDescription>
          </div>
          {taskId ? (
            <Button asChild variant="ghost" size="sm" className="mr-8">
              <Link href={`/tasks/${taskId}`}>
                <ExternalLink /> Open full page
              </Link>
            </Button>
          ) : null}
        </SheetHeader>
        <div className="px-5 py-4">{taskId ? <TaskDetails key={taskId} taskId={taskId} /> : null}</div>
      </SheetContent>
    </Sheet>
  );
}
