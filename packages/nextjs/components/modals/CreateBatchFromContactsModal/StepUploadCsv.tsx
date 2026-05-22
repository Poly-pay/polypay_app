"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatFileSize } from "~~/utils/format";
import { notification } from "~~/utils/scaffold-eth";

type CsvUploadState = "idle" | "importing" | "loaded";

const IMPORT_PROGRESS_INTERVAL_MS = 100;
const TEMPLATE_PROGRESS_INTERVAL_MS = 150;

export function StepUploadCsv({
  onFileReady,
  onFileRemoved,
}: {
  onFileReady: (file: File) => void;
  onFileRemoved: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<CsvUploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [templateProgress, setTemplateProgress] = useState(0);
  const importTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      notification.error("Please upload a CSV file");
      return;
    }
    setFile(selectedFile);
    setUploadState("importing");
    setImportProgress(0);

    // Simulate import progress (local file read is near-instant)
    let progress = 0;
    importTimerRef.current = setInterval(() => {
      progress += 20;
      setImportProgress(Math.min(progress, 100));
      if (progress >= 100) {
        if (importTimerRef.current) clearInterval(importTimerRef.current);
        setUploadState("loaded");
        onFileReady(selectedFile);
      }
    }, IMPORT_PROGRESS_INTERVAL_MS);
  };

  const handleCancelImport = () => {
    if (importTimerRef.current) clearInterval(importTimerRef.current);
    setUploadState("idle");
    setFile(null);
    setImportProgress(0);
    onFileRemoved();
  };

  const handleRemoveFile = () => {
    setUploadState("idle");
    setFile(null);
    setImportProgress(0);
    onFileRemoved();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleDownloadTemplate = () => {
    setTemplateDownloading(true);
    setTemplateProgress(0);

    // Simulate brief download progress
    let progress = 0;
    const timer = setInterval(() => {
      progress += 25;
      setTemplateProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(timer);
        setTemplateDownloading(false);
        setTemplateProgress(0);
      }
    }, TEMPLATE_PROGRESS_INTERVAL_MS);

    // Trigger actual download
    const link = document.createElement("a");
    link.href = "/templates/batch-template.csv";
    link.download = "batch-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (importTimerRef.current) clearInterval(importTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => uploadState === "idle" && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 border border-dashed rounded-2xl h-[240px] transition-colors ${
          uploadState !== "idle"
            ? "border-grey-300 bg-grey-50"
            : isDragging
              ? "border-main-pink bg-pink-50 cursor-pointer"
              : "border-grey-300 bg-grey-50 cursor-pointer hover:border-grey-400"
        }`}
      >
        <Image src="/icons/batch/export-upload.svg" alt="Upload" width={44} height={44} className="opacity-50" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-base font-medium text-grey-950 tracking-tight">Import CSV file</p>
          <p className="text-sm font-medium text-grey-500 tracking-tight">Drop the file or click here to choose file</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => {
            const selected = e.target.files?.[0];
            if (selected) handleFile(selected);
            e.target.value = "";
          }}
        />
      </div>

      {/* File info card - importing state */}
      {uploadState === "importing" && file && (
        <div className="flex items-center gap-2 border border-main-pink rounded-[14px] px-3 py-2">
          <Image src="/icons/batch/export-upload.svg" alt="Uploading" width={28} height={28} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-grey-950 tracking-tight truncate">{file.name}</p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-grey-900 tracking-tight">{importProgress}%</span>
              <div className="size-[14px] animate-spin rounded-full border-2 border-grey-300 border-t-main-pink" />
            </div>
          </div>
          <button onClick={handleCancelImport} className="shrink-0 cursor-pointer">
            <Image src="/icons/batch/close-circle.svg" alt="Cancel" width={20} height={20} />
          </button>
        </div>
      )}

      {/* File info card - loaded state */}
      {uploadState === "loaded" && file && (
        <div className="flex items-center gap-2 border border-grey-300 rounded-[14px] px-3 py-2">
          <Image src="/icons/batch/csv-file.svg" alt="CSV" width={28} height={28} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-grey-950 tracking-tight truncate">{file.name}</p>
            <p className="text-sm font-medium text-grey-900 tracking-tight">{formatFileSize(file.size)}</p>
          </div>
          <button onClick={handleRemoveFile} className="shrink-0 cursor-pointer">
            <Image src="/contact-book/trash.svg" alt="Remove" width={20} height={20} />
          </button>
        </div>
      )}

      {/* Download template link */}
      <div className="flex items-center gap-1">
        <Image src="/icons/batch/document-download.svg" alt="Download" width={20} height={20} />
        <button
          onClick={handleDownloadTemplate}
          className="flex-1 text-sm font-medium text-grey-500 tracking-tight text-left cursor-pointer hover:text-grey-700"
        >
          Download CSV template (21 B)
        </button>
        {templateDownloading && (
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-grey-900 tracking-tight">{templateProgress}%</span>
            <div className="size-[14px] animate-spin rounded-full border-2 border-grey-300 border-t-main-pink" />
          </div>
        )}
      </div>
    </div>
  );
}
