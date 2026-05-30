"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { copyText } from "@/lib/clipboard";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export default function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(text);
    setCopied(ok);
    setFailed(!ok);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
  }, [text]);

  let labelText = label;
  if (copied) labelText = "Copied.";
  if (failed) labelText = "Failed";

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`rounded border px-2.5 py-1 text-xs transition-colors duration-150 ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : failed
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
      } ${className}`}
    >
      <span aria-live="polite">{labelText}</span>
    </button>
  );
}
