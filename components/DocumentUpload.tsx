"use client";

import { useCallback, useRef, useState } from "react";

interface UploadProgress {
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  message?: string;
}

export function DocumentUpload({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles = Array.from(files).filter((file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      return ext === "pdf" || ext === "txt";
    });

    if (validFiles.length === 0) {
      alert("Please select PDF or TXT files only");
      return;
    }

    for (const file of validFiles) {
      setUploads((prev) => [
        ...prev,
        { filename: file.name, progress: 0, status: "pending" },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name ? { ...u, status: "uploading" } : u
          )
        );

        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          setUploads((prev) =>
            prev.map((u) =>
              u.filename === file.name
                ? {
                    ...u,
                    status: "error",
                    message:
                      error.error || "Upload failed",
                    progress: 0,
                  }
                : u
            )
          );
        } else {
          const data = await response.json();
          setUploads((prev) =>
            prev.map((u) =>
              u.filename === file.name
                ? {
                    ...u,
                    status: "success",
                    message: `${data.inserted} chunks ingested`,
                    progress: 100,
                  }
                : u
            )
          );
          onUploadComplete?.();
        }
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name
              ? {
                  ...u,
                  status: "error",
                  message: err instanceof Error ? err.message : "Unknown error",
                  progress: 0,
                }
              : u
          )
        );
      }
    }
  }, [onUploadComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-muted"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        <div className="text-center">
          <div className="text-2xl mb-2">📄</div>
          <p className="font-medium text-foreground">Drag & drop files</p>
          <p className="text-sm text-muted">or click to browse</p>
          <p className="text-xs text-muted mt-2">PDF and TXT only</p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.filename}
              className="p-3 bg-card border border-border rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate">
                  {upload.filename}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    upload.status === "success"
                      ? "text-success"
                      : upload.status === "error"
                        ? "text-error"
                        : "text-muted"
                  }`}
                >
                  {upload.status === "uploading" ? "Uploading..." : upload.status}
                </span>
              </div>
              {upload.message && (
                <p className="text-xs text-muted mb-2">{upload.message}</p>
              )}
              {upload.status === "uploading" && (
                <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
