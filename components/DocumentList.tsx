"use client";

export interface UploadedDocument {
  filename: string;
  uploadedAt: string;
  chunkCount: number;
}

export function DocumentList({
  documents,
}: {
  documents?: UploadedDocument[];
}) {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">
        Recent uploads
      </p>
      {documents.map((doc) => (
        <div
          key={doc.filename}
          className="p-3 bg-card border border-border rounded-lg hover:border-muted transition-colors"
        >
          <p className="text-sm font-medium text-foreground truncate">
            {doc.filename}
          </p>
          <p className="text-xs text-muted mt-1">
            {doc.chunkCount} chunks • {new Date(doc.uploadedAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
