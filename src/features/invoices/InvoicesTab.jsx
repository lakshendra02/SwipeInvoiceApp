import React from "react";
import { useDispatch } from "react-redux";
import { useUpdateDataMutation } from "../data/firestoreApi";
import updateEntity from "../data/dataSlice";
import { useSortableData } from "../../hooks/useSortableData";
import EditableCell from "../../components/EditableCell";
import { ArrowUp, ArrowDown } from "lucide-react";

const InvoicesTab = ({ data, userId }) => {
  const dispatch = useDispatch();
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();

  // 1. Flatten the data for display
  // We add unique IDs and parent info to each line item
  const flatInvoiceItems = data.invoices.flatMap((invoice) =>
    invoice.lineItems.map((item, index) => {
      // Use the invoice ID if it exists, otherwise fall back to serialNumber
      const parentId = invoice.id || invoice.serialNumber;
      const uniqueLineItemId = `${parentId}-${index}`;
      return {
        ...item,
        uniqueLineItemId: uniqueLineItemId,
        parentInvoiceId: parentId,
        serialNumber: invoice.serialNumber,
        date: invoice.invoiceDate,
        customerName: invoice.customerName,
        companyName: invoice.companyName,
        status: invoice.status,
      };
    })
  );

  // 2. Setup sorting
  const {
    items: sortedItems,
    requestSort,
    sortConfig,
  } = useSortableData(flatInvoiceItems, {
    key: "date",
    direction: "descending",
  });

  // 3. Handle data updates
  const handleUpdate = async (
    uniqueLineItemId,
    field,
    value,
    entityType = "invoices"
  ) => {
    const itemToUpdate = flatInvoiceItems.find(
      (item) => item.uniqueLineItemId === uniqueLineItemId
    );
    if (!itemToUpdate) return;

    // Create a deep copy of the data to mutate
    let newData = JSON.parse(JSON.stringify(data));

    // Find the parent invoice
    const parentInvoice = newData.invoices.find(
      (inv) =>
        inv.id === itemToUpdate.parentInvoiceId ||
        inv.serialNumber === itemToUpdate.parentInvoiceId
    );
    if (!parentInvoice) return;

    // Find the specific line item
    const lineItem = parentInvoice.lineItems.find(
      (item) => item.id === itemToUpdate.id
    );

    let syncUpdate = null;

    // Update the field
    if (entityType === "invoices") {
      if (field === "customerName") {
        parentInvoice.customerName = value;
        // Sync update to the customer record
        syncUpdate = {
          id: parentInvoice.customer_id,
          field: "name",
          value,
          entityType: "customers",
        };
      } else if (field === "companyName") {
        parentInvoice.companyName = value;
        // Sync update to the customer record
        syncUpdate = {
          id: parentInvoice.customer_id,
          field: "companyName",
          value,
          entityType: "customers",
        };
      } else if (field === "status") {
        parentInvoice.status = value;
      } else if (lineItem && field === "productName") {
        lineItem.productName = value;
        // Prepare a sync update for the Products tab
        syncUpdate = {
          id: lineItem.product_id,
          field: "name",
          value,
          entityType: "products",
        };
      } else if (lineItem && field === "unitPrice") {
        lineItem.unitPrice = Number(value);
      } else if (lineItem && field === "qty") {
        lineItem.qty = Number(value);
      }
      // Add more fields as needed (e.g., tax, totalAmount)
    }

    // TODO: Recalculate totals if qty, price, or tax changes

    try {
      // Save the entire updated data object to Firestore
      await updateData({ userId, newData }).unwrap();
      // If successful, dispatch a local Redux action to sync other tabs
      if (syncUpdate) {
        dispatch(updateEntity(syncUpdate));
      }
    } catch (error) {
      console.error("Failed to update data:", error);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader
              label="Date"
              sortKey="date"
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
              label="Unit Price"
              sortKey="unitPrice"
              requestSort={requestSort}
              sortConfig={sortConfig}
              className="text-right"
            />
            <SortableHeader
              label="Qty"
              sortKey="qty"
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
          {sortedItems.map((item) => (
            <tr key={item.uniqueLineItemId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.date || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.serialNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <EditableCell
                  value={item.customerName}
                  onSave={(value) =>
                    handleUpdate(item.uniqueLineItemId, "customerName", value)
                  }
                  isMissing={!item.customerName}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <EditableCell
                  value={item.companyName}
                  onSave={(value) =>
                    handleUpdate(item.uniqueLineItemId, "companyName", value)
                  }
                  isMissing={!item.companyName}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <EditableCell
                  value={item.productName}
                  onSave={(value) =>
                    handleUpdate(item.uniqueLineItemId, "productName", value)
                  }
                  isMissing={item._missing}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={item.unitPrice}
                  onSave={(value) =>
                    handleUpdate(item.uniqueLineItemId, "unitPrice", value)
                  }
                  isMissing={item._missing && item.unitPrice == null}
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                <EditableCell
                  value={item.qty}
                  onSave={(value) =>
                    handleUpdate(item.uniqueLineItemId, "qty", value)
                  }
                  isMissing={item._missing && item.qty == null}
                  type="number"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                {item.tax != null ? `${item.tax}%` : "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {item.totalAmount != null
                  ? `$${item.totalAmount.toFixed(2)}`
                  : "N/A"}
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(
                    item.status
                  )}`}
                >
                  <EditableCell
                    value={item.status}
                    onSave={(value) =>
                      handleUpdate(item.uniqueLineItemId, "status", value)
                    }
                    isMissing={!item.status}
                    className="bg-transparent" // Makes cell blend in
                  />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default InvoicesTab;
