import { useEffect } from "react";

/**
 * Keep a 1-based page number inside [1, totalPages].
 * Needed when orders are deleted (here or by someone else) and the current
 * page no longer exists — otherwise the table shows "no orders".
 */
export function usePageClamp(page, setPage, totalPages) {
  useEffect(() => {
    const last = Math.max(1, totalPages);
    if (page > last) setPage(last);
    else if (page < 1) setPage(1);
  }, [page, setPage, totalPages]);
}

/** Total page count, never below 1 so the pager reads "1 از 1" when empty. */
export const pageCount = (total, pageSize) => Math.max(1, Math.ceil(total / pageSize));
