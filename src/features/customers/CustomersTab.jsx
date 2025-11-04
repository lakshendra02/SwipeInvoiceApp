import React, { useMemo, useState } from "react"; // Added useState
import { useDispatch } from "react-redux";
import { useUpdateDataMutation } from "../data/firestoreApi";
import updateEntity from "../data/dataSlice";
import { useSortableData } from "../../hooks/useSortableData";
import EditableCell from "../../components/EditableCell";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"; // Added icons

const ITEMS_PER_PAGE = 25;

const CustomersTab = ({ data, userId }) => {
  const dispatch = useDispatch();
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();
  const [currentPage, setCurrentPage] = useState(1); // Page state

  // Convert customers object to an array for sorting
  const customersArray = useMemo(
    () => Object.values(data.customers),
    [data.customers]
  );

  const {
    items: sortedCustomers,
    requestSort,
    sortConfig,
  } = useSortableData(customersArray, { key: "name", direction: "ascending" });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    return sortedCustomers.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [sortedCustomers, currentPage]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => {
    goToPage(currentPage + 1);
  };

  const prevPage = () => {
    goToPage(currentPage - 1);
  };
  // --- END PAGINATION LOGIC ---

  const handleUpdate = async (customerId, field, value) => {
    // Create a deep copy of the data
    let newData = JSON.parse(JSON.stringify(data));

    // Find and update the customer
    const customer = newData.customers[customerId];
    if (customer) {
      customer[field] = value;
    } else {
      console.error("Customer not found for update:", customerId);
      return;
    }

    // When a customer's name or company changes, update all their invoices
    if (field === "name" || field === "companyName") {
      newData.invoices.forEach((invoice) => {
        if (invoice.customer_id === customerId) {
          if (field === "name") {
            invoice.customerName = value;
          } else if (field === "companyName") {
            invoice.companyName = value;
          }
        }
      });
    }

    try {
      // Save the entire data object to Firestore
      await updateData({ userId, newData }).unwrap();
      // Dispatch local Redux action to sync other tabs
      dispatch(
        updateEntity({
          id: customerId,
          field: field,
          value: value,
          entityType: "customers",
        })
      );
    } catch (error) {
      console.error("Failed to update customer:", error);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader
              label="Customer Name"
              sortKey="name"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Company Name"
              sortKey="companyName"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Phone Number"
              sortKey="phone"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Total Purchase Amt"
              sortKey="totalPurchaseAmount"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Use paginatedItems here */}
          {paginatedItems.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <EditableCell
                  value={customer.name}
                  onSave={(value) => handleUpdate(customer.id, "name", value)}
                  isMissing={customer._missing && !customer.name}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <EditableCell
                  value={customer.companyName}
                  onSave={(value) =>
                    handleUpdate(customer.id, "companyName", value)
                  }
                  isMissing={customer._missing && !customer.companyName}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <EditableCell
                  value={customer.phone}
                  onSave={(value) => handleUpdate(customer.id, "phone", value)}
                  isMissing={customer._missing && !customer.phone}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {customer.totalPurchaseAmount != null
                  ? `$${customer.totalPurchaseAmount.toFixed(2)}`
                  : "$0.00"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- PAGINATION CONTROLS --- */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          goToPage={goToPage}
          nextPage={nextPage}
          prevPage={prevPage}
        />
      )}
    </div>
  );
};

// --- ADDED HELPER COMPONENTS ---

/**
 * Renders the sort direction arrow.
 */
export const getSortIndicator = (sortConfig, sortKey) => {
  if (sortConfig.key === sortKey) {
    if (sortConfig.direction === "ascending") {
      return <ArrowUp size={14} className="ml-1" />;
    }
    return <ArrowDown size={14} className="ml-1" />;
  }
  return null;
};

/**
 * A reusable table header component that handles sorting.
 */
export const SortableHeader = ({
  label,
  sortKey,
  requestSort,
  sortConfig,
  className = "",
}) => (
  <th
    scope="col"
    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
    onClick={() => requestSort(sortKey)}
  >
    <div className="flex items-center">
      {label}
      {getSortIndicator(sortConfig, sortKey)}
    </div>
  </th>
);

/**
 * A reusable pagination control component.
 */
const PaginationControls = ({
  currentPage,
  totalPages,
  goToPage,
  nextPage,
  prevPage,
}) => {
  const pageNumbers = [];
  // Show max 5 page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  }
  if (currentPage > totalPages - 3) {
    startPage = Math.max(1, totalPages - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav
      className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
      aria-label="Pagination"
    >
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  page === currentPage
                    ? "z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </nav>
  );
};

export default CustomersTab;
