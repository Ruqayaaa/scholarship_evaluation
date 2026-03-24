import React, { useRef } from "react";

type Props = {
  label: string;
  description?: string;
  acceptedFormats?: string;
  maxSize?: number;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
};

export function FileUpload({
  label,
  description,
  acceptedFormats = "",
  maxSize = 10,
  multiple = false,
  files,
  onFilesChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => inputRef.current?.click();

  const validateAndSet = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const picked = Array.from(fileList);

    // size check
    const tooBig = picked.find((f) => f.size > maxSize * 1024 * 1024);
    if (tooBig) {
      alert(`"${tooBig.name}" is too large. Max size is ${maxSize}MB.`);
      return;
    }

    onFilesChange(multiple ? picked : [picked[0]]);
  };

  const removeFile = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onFilesChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>{label}</div>
        {description ? (
          <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>{description}</div>
        ) : null}
      </div>


      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => validateAndSet(e.target.files)}
      />

  
      <button type="button" className="primary-btn" onClick={openPicker} style={{ width: "fit-content" }}>
        Upload file
      </button>

      <div style={{ color: "var(--muted)", fontSize: 13 }}>
        {acceptedFormats ? `${acceptedFormats} • ` : ""}
        Max {maxSize}MB
      </div>

      {/* Uploaded file list */}
      {files?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 10,
                background: "rgba(255,255,255,0.70)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
              <button type="button" className="ghost-btn" onClick={() => removeFile(i)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
