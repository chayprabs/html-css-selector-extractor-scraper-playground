"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

/**
 * Reusable copy-to-clipboard button with visual feedback.
 * Shows "Copied!" for 2s after successful copy.
 */
export default function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-live="polite"
      className={`px-2.5 py-1 text-xs rounded transition-colors duration-150 ${
        copied
          ? "bg-green-600/20 text-green-400 border border-green-600/40"
          : "bg-[#1e1e1e] text-[#888] border border-[#333] hover:text-[#ccc] hover:border-[#555]"
      } ${className}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
