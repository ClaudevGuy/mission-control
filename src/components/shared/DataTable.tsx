"use client";

import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SkeletonTable } from "./SkeletonTable";

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

type SortDir = "asc" | "desc";

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  selectable = false,
  onSelectionChange,
  pageSize = 10,
  emptyMessage = "No data found.",
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setPage(0);
    },
    [sortKey]
  );

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey);
      const bVal = getNestedValue(b, sortKey);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSelect = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
    onSelectionChange?.(
      Array.from(next).map((i) => sortedData[i])
    );
  };

  const toggleAll = () => {
    if (selected.size === sortedData.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const all = new Set(sortedData.map((_, i) => i));
      setSelected(all);
      onSelectionChange?.([...sortedData]);
    }
  };

  if (loading) {
    return <SkeletonTable columns={columns.length} />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {selectable && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selected.size === sortedData.length && sortedData.length > 0}
                  onChange={toggleAll}
                  className="size-4 rounded border-white/20 bg-transparent accent-cyan-500"
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(col.className)}>
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            pagedData.map((item, idx) => {
              const globalIdx = page * pageSize + idx;
              return (
                <TableRow
                  key={globalIdx}
                  className={cn(
                    "border-border/50 hover:bg-muted/30 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        checked={selected.has(globalIdx)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(globalIdx);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 rounded border-white/20 bg-transparent accent-cyan-500"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(col.className)}>
                      {col.render
                        ? col.render(item)
                        : String(getNestedValue(item, col.key) ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-4">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} ({sortedData.length} items)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
