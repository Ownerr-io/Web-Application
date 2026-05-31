import React, { useMemo, useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

export type Column<T> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
};

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  pageSize = 20,
  searchable = false,
  searchKeys = [],
  emptyMessage = "No data available",
  isLoading = false,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ NEW: dynamic page size
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // 🔍 FILTER
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || searchKeys.length === 0) return data;

    const query = searchQuery.toLowerCase();

    return data.filter((row) =>
      searchKeys.some((key) => {
        const value = (row as any)[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      }),
    );
  }, [data, searchKeys, searchQuery]);

  // 🔃 SORT
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? 1 : -1;
      if (bValue == null) return sortDirection === "asc" ? -1 : 1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortDirection, sortKey]);

  // 📄 PAGINATION
  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [currentPage, rowsPerPage, sortedData]);

  // 🔄 RESET PAGE WHEN FILTER/SORT/PAGE SIZE CHANGES
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortKey, sortDirection, rowsPerPage]);

  // 🔽 SORT HANDLER
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const key = column.sortKey ?? String(column.key);

    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;

    const key = column.sortKey ?? String(column.key);

    if (sortKey !== key) {
      return <ArrowUpDown className="h-4 w-4 opacity-30" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* 🔍 SEARCH */}
      {searchable && searchKeys.length > 0 && (
        <Input
          placeholder={`Search by ${searchKeys.join(", ")}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          className="max-w-md"
        />
      )}

      {/* 📊 TABLE */}
      <div className="overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={column.className}
                  onClick={() => handleSort(column)}
                  style={{
                    cursor: column.sortable ? "pointer" : "default",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {getSortIcon(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={String(row.id ?? rowIndex)}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined
                  }
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => {
                    const value = (row as any)[column.key];
                    const content =
                      column.render?.(value, row, rowIndex) ?? value;

                    return (
                      <TableCell
                        key={String(column.key)}
                        className={column.className}
                      >
                        <div className="truncate">{content}</div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 📄 PAGINATION CONTROLS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          {paginatedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} -{" "}
          {Math.min(currentPage * rowsPerPage, sortedData.length)} of{" "}
          {sortedData.length}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>

          {/* ✅ FIXED PAGE SIZE SELECT */}
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
