"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchSuggestions as innerTubeSuggestions } from "@/lib/innerTube";
import { searchSuggestions as saavnSuggestions } from "@/lib/saavn";
import { Icon } from "./Icon";

interface Props {
  query: string;
  onSelect: (query: string) => void;
  onSearch: (query: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function SearchSuggestions({ query, onSelect, onSearch, inputRef }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const rootRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const [innerTube, saavn] = await Promise.allSettled([
      innerTubeSuggestions(q).catch(() => [] as string[]),
      saavnSuggestions(q).catch(() => [] as string[]),
    ]);
    const results = [
      ...(innerTube.status === "fulfilled" ? innerTube.value : []),
      ...(saavn.status === "fulfilled" ? saavn.value : []),
    ];
    const unique = [...new Set(results)].slice(0, 8);
    setSuggestions(unique);
    setIsOpen(unique.length > 0);
    setSelectedIndex(-1);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => void fetchSuggestions(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      onSelect(suggestions[selectedIndex]);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, [isOpen, suggestions, selectedIndex, onSelect]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handler = (e: KeyboardEvent) => handleKeyDown(e as unknown as React.KeyboardEvent);
    input.addEventListener("keydown", handler);
    return () => input.removeEventListener("keydown", handler);
  }, [handleKeyDown, inputRef]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-elevated shadow-xl animate-fade-in"
    >
      {suggestions.map((s, i) => (
        <button
          key={s}
          onClick={() => { onSelect(s); setIsOpen(false); }}
          onMouseEnter={() => setSelectedIndex(i)}
          className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
            i === selectedIndex ? "bg-elevated-hover text-on-surface" : "text-muted hover:text-on-surface"
          }`}
        >
          <Icon path="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" size={14} />
          <span className="truncate">{s}</span>
        </button>
      ))}
    </div>
  );
}
