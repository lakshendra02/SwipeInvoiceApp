import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useUpdateDataMutation } from "../data/firestoreApi";
import { useSortableData } from "../../hooks/useSortableData";
import EditableCell from "../../components/EditableCell";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 25;

const InvoicesTab = ({ data, userId }) => {
  const dispatch = useDispatch();
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();
  const [currentPage, setCurrentPage] = useState(1);

  const lineItemsArray = useMemo(() => {
    return data.invoices.flatMap((invoice) =>
      invoice.lineItems.map((item, index) => {
        const uniqueLineItemId =
          item.id || `${invoice.id || invoice.serialNumber}-${index}`;
        return {
          ...item,
          uniqueLineItemId: uniqueLineItemId,
          parentInvoiceId: invoice.id || invoice.serialNumber,
          serialNumber: invoice.serialNumber,
          invoiceDate: invoice.invoiceDate,
          customerName: invoice.customerName,
          companyName: invoice.companyName,
          status: invoice.status,
        };
      })
    );
  }, [data.invoices]);

  const {
    items: sortedLineItems,
    requestSort,
    sortConfig,
  } = useSortableData(lineItemsArray, {
    key: "invoiceDate",
    direction: "descending",
  });

  const totalPages = Math.ceil(sortedLineItems.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    return sortedLineItems.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [sortedLineItems, currentPage]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleUpdate = async (parentInvoiceId, lineItemId, field, value) => {
    let newData = JSON.parse(JSON.stringify(data));
    const invoice = newData.invoices.find(
      (inv) =>
        inv.id === parentInvoiceId || inv.serialNumber === parentInvoiceId
    );

    if (invoice) {
      const item = invoice.lineItems.find(
        (li) => li.id === lineItemId || li.product_id === lineItemId
      );

      if (item) {
        if (
          field === "qty" ||
          field === "unitPrice" ||
          field === "tax" ||
          field === "totalAmount"
        ) {
          item[field] = Number(value);
        } else {
          item[field] = value;
        }

        if (field === "qty" || field === "unitPrice" || field === "tax") {
          const taxRate = (item.tax || 0) / 100;
          const priceBeforeTax = (item.unitPrice || 0) * (item.qty || 0);
          const taxAmount = priceBeforeTax * taxRate;
          item.totalAmount = priceBeforeTax + taxAmount;
        }

        try {
          await updateData({ userId, newData }).unwrap();
        } catch (error) {
          console.error("Failed to update invoice line item:", error);
        }
      } else {
        console.error("Line item not found:", lineItemId);
      }
    } else {
      console.error("Invoice not found:", parentInvoiceId);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader
              label="Date"
              sortKey="invoiceDate"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Serial #"
              sortKey="serialNumber"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Customer"
              sortKey="customerName"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Company"
              sortKey="companyName"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Product"
              sortKey="productName"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Qty"
              sortKey="qty"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
            <SortableHeader
              label="Unit Price"
              sortKey="unitPrice"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
            <SortableHeader
              label="Tax %"
              sortKey="tax"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
            <SortableHeader
              label="Total"
              sortKey="totalAmount"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
            <SortableHeader
              label="Status"
              sortKey="status"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedItems.map((item) => (
            <tr key={item.uniqueLineItemId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.invoiceDate || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.serialNumber || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.customerName || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.companyName || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <EditableCell
                  value={item.productName}
                  onSave={(value) =>
                    handleUpdate(
                      item.parentInvoiceId,
                      item.product_id,
                      "productName",
                      value
                    )
                  }
                  isMissing={item._missing && !item.productName}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={item.qty}
                  onSave={(value) =>
                    handleUpdate(
                      item.parentInvoiceId,
                      item.product_id,
                      "qty",
                      value
                    )
                  }
                  isMissing={item._missing && item.qty == null}
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={item.unitPrice}
                  onSave={(value) =>
                    handleUpdate(
                      item.parentInvoiceId,
                      item.product_id,
                      "unitPrice",
                      value
                    )
                  }
                  isMissing={item._missing && item.unitPrice == null}
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={item.tax}
                  onSave={(value) =>
                    handleUpdate(
                      item.parentInvoiceId,
                      item.product_id,
                      "tax",
                      value
                    )
                  }
                  isMissing={item._missing && item.tax == null}
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {item.totalAmount != null
                  ? `$${item.totalAmount.toFixed(2)}`
                  : "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.status === "Paid"
                      ? "bg-green-100 text-green-800"
                      : item.status === "Pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {item.status || "N/A"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          goToPage={goToPage}
          nextPage={() => goToPage(currentPage + 1)}
          prevPage={() => goToPage(currentPage - 1)}
        />
      )}
    </div>
  );
};

const getSortIndicator = (sortConfig, sortKey) => {
  if (sortConfig.key === sortKey) {
    return sortConfig.direction === "ascending" ? (
      <ArrowUp size={14} className="ml-1" />
    ) : (
      <ArrowDown size={14} className="ml-1" />
    );
  }
  return null;
};

const SortableHeader = ({
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

const PaginationControls = ({
  currentPage,
  totalPages,
  goToPage,
  nextPage,
  prevPage,
}) => {
  const pageNumbers = [];
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) endPage = Math.min(5, totalPages);
  if (currentPage > totalPages - 3) startPage = Math.max(1, totalPages - 4);

  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

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
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  page === currentPage
                    ? "z-10 bg-indigo-600 text-white focus:z-20"
                    : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20"
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
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </nav>
  );
};

export default InvoicesTab;
