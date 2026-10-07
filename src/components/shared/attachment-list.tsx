"use client";

import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { formatBytes, formatRelative } from "@/lib/format";
import type { Attachment } from "@/types/domain";

interface AttachmentListProps {
  attachments: Attachment[];
  onUpload?: (file: File) => void;
  uploading?: boolean;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
  maxSizeMb?: number;
  onReject?: (message: string) => void;
}

export const isImageFile = (file: Pick<Attachment, "fileName" | "mimeType">) =>
  file.mimeType ? file.mimeType.startsWith("image/") : /\.(png|jpe?g|gif|webp)$/i.test(file.fileName);

export function AttachmentList({ attachments, onUpload, uploading, onDelete, deletingId, maxSizeMb = 25, onReject }: AttachmentListProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <EmptyState icon={Paperclip} title="No files yet." compact />
      ) : (
        <ul className="divide-y rounded-lg border">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-3 py-2">
              {isImageFile(file) ? (
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="shrink-0" tabIndex={-1} aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on external storage */}
                  <img src={file.url} alt="" className="size-10 rounded border object-cover" loading="lazy" />
                </a>
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:underline">
                  {file.fileName}
                </a>
                <p className="truncate text-xs text-muted-foreground">
                  {[formatBytes(file.size), file.uploadedBy?.name, file.createdAt ? formatRelative(file.createdAt) : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button asChild variant="ghost" size="icon-sm">
                <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`Download ${file.fileName}`}>
                  <Download />
                </a>
              </Button>
              {onDelete ? (
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${file.fileName}`} onClick={() => onDelete(file.id)} disabled={deletingId === file.id}>
                  {deletingId === file.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {onUpload ? (
        <>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > maxSizeMb * 1024 * 1024) {
                onReject?.(`Files must be ${maxSizeMb} MB or smaller.`);
                return;
              }
              onUpload(file);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? "Uploading…" : "Upload file"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
