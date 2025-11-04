import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useUpdateDataMutation } from "../data/firestoreApi";
import updateEntity from "../data/dataSlice";
import { useSortableData } from "../../hooks/useSortableData";
import EditableCell from "../../components/EditableCell";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 25;

const ProductsTab = ({ data, userId }) => {
  const dispatch = useDispatch();
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();
  const [currentPage, setCurrentPage] = useState(1);

  // Convert products object to an array for sorting and processing
  const productsArray = useMemo(() => {
    return Object.values(data.products).map((product) => {
      // --- UPDATED PRICE CALCULATION ---
      const taxRate = (product.tax || 0) / 100;
      const discountRate = (product.discount || 0) / 100;
      const priceAfterDiscount = (product.unitPrice || 0) * (1 - discountRate);
      const priceWithTax = priceAfterDiscount * (1 + taxRate);
      // --- END CALCULATION ---
      return {
        ...product,
        priceWithTax: priceWithTax,
      };
    });
  }, [data.products]);

  const {
    items: sortedProducts,
    requestSort,
    sortConfig,
  } = useSortableData(productsArray, { key: "name", direction: "ascending" });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    return sortedProducts.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [sortedProducts, currentPage]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  // --- END PAGINATION LOGIC ---

  const handleUpdate = async (productId, field, value) => {
    let newData = JSON.parse(JSON.stringify(data));
    const product = newData.products[productId];

    if (product) {
      if (
        field === "unitPrice" ||
        field === "tax" ||
        field === "quantity" ||
        field === "discount" // <-- ADDED
      ) {
        product[field] = Number(value);
      } else {
        product[field] = value;
      }
    } else {
      console.error("Product not found for update:", productId);
      return;
    }

    // When a product's name changes, update all invoice line items
    if (field === "name") {
      newData.invoices.forEach((invoice) => {
        invoice.lineItems.forEach((item) => {
          if (item.product_id === productId) {
            item.productName = value;
          }
        });
      });
    }

    // --- Recalculate Price with Tax ---
    if (field === "unitPrice" || field === "tax" || field === "discount") {
      const taxRate = (product.tax || 0) / 100;
      const discountRate = (product.discount || 0) / 100;
      const priceAfterDiscount = (product.unitPrice || 0) * (1 - discountRate);
      product.priceWithTax = priceAfterDiscount * (1 + taxRate);
    }
    // --- End Recalculation ---

    try {
      await updateData({ userId, newData }).unwrap();
      dispatch(
        updateEntity({
          id: productId,
          field: field,
          value: value,
          entityType: "products",
        })
      );
    } catch (error) {
      console.error("Failed to update product:", error);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader
              label="Product Name"
              sortKey="name"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            <SortableHeader
              label="Brand"
              sortKey="brand"
              requestSort={requestSort}
              sortConfig={sortConfig}
            />
            {/* --- ADDED DISCOUNT COLUMN --- */}
            <SortableHeader
              label="Discount %"
              sortKey="discount"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
            <SortableHeader
              label="Quantity (Stock)"
              sortKey="quantity"
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
              label="Price with Tax"
              sortKey="priceWithTax"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedItems.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <EditableCell
                  value={product.name}
                  onSave={(value) => handleUpdate(product.id, "name", value)}
                  isMissing={product._missing && !product.name}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <EditableCell
                  value={product.brand}
                  onSave={(value) => handleUpdate(product.id, "brand", value)}
                />
              </td>
              {/* --- ADDED DISCOUNT CELL --- */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={product.discount}
                  onSave={(value) =>
                    handleUpdate(product.id, "discount", value)
                  }
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={product.quantity}
                  onSave={(value) =>
                    handleUpdate(product.id, "quantity", value)
                  }
                  isMissing={product._missing && product.quantity == null}
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={product.unitPrice}
                  onSave={(value) =>
                    handleUpdate(product.id, "unitPrice", value)
                  }
                  isMissing={product._missing && product.unitPrice == null}
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={product.tax}
                  onSave={(value) => handleUpdate(product.id, "tax", value)}
                  isMissing={product._missing && product.tax == null}
                  type="number"
                  ANd
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {product.priceWithTax != null
                  ? `$${product.priceWithTax.toFixed(2)}`
                  : "N/A"}
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

// --- HELPER COMPONENTS ---

const getSortIndicator = (sortConfig, sortKey) => {
  if (sortConfig.key === sortKey) {
    return sortConfig.direction === "ascending" ? (
      <ArrowUp size={14} className="ml-1" />
    ) : (
      <ArrowDown size={14} className="ml-1" L />
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

export default ProductsTab;
