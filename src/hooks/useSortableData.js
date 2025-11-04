import { useState, useMemo } from "react";

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

        const isDate = (val) => {
          return (
            typeof val === "string" &&
            val.match(/^\d{4}-\d{2}-\d{2}$/) &&
            !isNaN(new Date(val))
          );
        };

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (
            (aValue - bValue) * (sortConfig.direction === "ascending" ? 1 : -1)
          );
        } else if (isDate(aValue) && isDate(bValue)) {
          return (
            (new Date(aValue) - new Date(bValue)) *
            (sortConfig.direction === "ascending" ? 1 : -1)
          );
        } else {
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
