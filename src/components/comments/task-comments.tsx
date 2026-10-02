"use client";

import { Loader2, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAddComment, useComments, useDeleteComment, useEditComment } from "@/hooks/queries/use-comments";
import { useUserOptions } from "@/hooks/queries/use-people";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/providers/auth-provider";
import type { Comment, ID, UserSummary } from "@/types/domain";
import { extractMentionIds, MentionTextarea } from "./mention-textarea";

/** Renders comment text with @handles highlighted. */
function CommentBody({ body }: { body: string }) {
  const parts = body.split(/(@[\w.]+)/g);
  return (
    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="rounded bg-primary/10 px-0.5 font-medium text-primary">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

export function TaskComments({ taskId }: { taskId: ID }) {
  const me = useCurrentUser();
  const comments = useComments(taskId);
  const users = useUserOptions();
  const people: UserSummary[] = users.data ?? [];

  if (comments.isLoading) return <ListSkeleton rows={3} />;
  if (comments.isError) return <ErrorState error={comments.error} title="Unable to load comments." onRetry={() => void comments.refetch()} compact />;

  const list = comments.data ?? [];
  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No comments yet." description="Start the conversation. Use @ to mention a teammate." compact />
      ) : (
        <ul className="space-y-4">
          {list.map((comment) => (
            <CommentItem key={comment.id} comment={comment} taskId={taskId} isMine={comment.author.id === me.id} people={people} />
          ))}
        </ul>
      )}
      <CommentComposer taskId={taskId} people={people} me={me} />
    </div>
  );
}

function CommentComposer({ taskId, people, me }: { taskId: ID; people: UserSummary[]; me: UserSummary }) {
  const [body, setBody] = useState("");
  const add = useAddComment(taskId, me);

  const submit = () => {
    const text = body.trim();
    if (!text || add.isPending) return;
    add.mutate({ body: text, mentionIds: extractMentionIds(text, people) });
    setBody("");
  };

  return (
    <form
      className="flex gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <UserAvatar user={me} size="sm" className="mt-1 size-7" />
      <div className="flex-1 space-y-2">
        <MentionTextarea
          id={`comment-${taskId}`}
          aria-label="Write a comment"
          value={body}
          onChange={setBody}
          users={people}
          placeholder="Write a comment… Use @ to mention, Ctrl+Enter to send"
          onSubmitShortcut={submit}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!body.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : null}
            Comment
          </Button>
        </div>
      </div>
    </form>
  );
}

function CommentItem({ comment, taskId, isMine, people }: { comment: Comment; taskId: ID; isMine: boolean; people: UserSummary[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const edit = useEditComment(taskId);
  const remove = useDeleteComment(taskId);
  const pending = comment.id.startsWith("optimistic-");

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    edit.mutate({ id: comment.id, body: text, mentionIds: extractMentionIds(text, people) }, { onSuccess: () => setEditing(false) });
  };

  return (
    <li className={cn("flex gap-3", pending && "opacity-60")}>
      <UserAvatar user={comment.author} size="sm" className="mt-0.5 size-7" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.author.name}</span>
          <time dateTime={comment.createdAt} title={formatDateTime(comment.createdAt)} className="text-xs text-muted-foreground">
            {pending ? "Sending…" : formatRelative(comment.createdAt)}
          </time>
          {comment.edited ? <span className="text-xs text-muted-foreground">(edited)</span> : null}
          {isMine && !pending && !editing ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="ml-auto" aria-label="Comment actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setDraft(comment.body);
                    setEditing(true);
                  }}
                >
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {editing ? (
          <div className="mt-1 space-y-2">
            <MentionTextarea id={`edit-${comment.id}`} aria-label="Edit comment" value={draft} onChange={setDraft} users={people} onSubmitShortcut={save} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={edit.isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={!draft.trim() || edit.isPending}>
                {edit.isPending ? <Loader2 className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <CommentBody body={comment.body} />
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete comment?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate(comment.id, { onSettled: () => setConfirmDelete(false) })}
      />
    </li>
  );
}
