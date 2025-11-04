import { useState, useMemo } from "react";

/**
 * A custom hook to manage sorting for tables.
 * @param {Array<object>} items - The initial array of data.
 * @param {object} initialConfig - The default sort config (e.g., { key: 'name', direction: 'ascending' }).
 * @returns {object} { sortedItems, requestSort, sortConfig }
 */
export const useSortableData = (items, initialConfig = null) => {
  const [sortConfig, setSortConfig] = useState(initialConfig);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] == null) return 1;
        if (b[sortConfig.key] == null) return -1;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Helper to check if a value is a valid date string
        const isDate = (val) => {
          return (
            typeof val === "string" &&
            val.match(/^\d{4}-\d{2}-\d{2}$/) &&
            !isNaN(new Date(val))
          );
        };

        // Determine data type for sorting
        if (typeof aValue === "number" && typeof bValue === "number") {
          // --- Number Sort ---
          return (
            (aValue - bValue) * (sortConfig.direction === "ascending" ? 1 : -1)
          );
        } else if (isDate(aValue) && isDate(bValue)) {
          // --- Date Sort ---
          return (
            (new Date(aValue) - new Date(bValue)) *
            (sortConfig.direction === "ascending" ? 1 : -1)
          );
        } else {
          // --- String Sort (default) ---
          return (
            aValue
              .toString()
              .localeCompare(bValue.toString(), "en", { numeric: true }) *
            (sortConfig.direction === "ascending" ? 1 : -1)
          );
        }
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};
