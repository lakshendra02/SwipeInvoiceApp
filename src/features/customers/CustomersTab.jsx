import React, { useMemo } from "react";
import { useDispatch } from "react-redux";
import { useUpdateDataMutation } from "../data/firestoreApi";
import updateEntity from "../data/dataSlice";
import { useSortableData } from "../../hooks/useSortableData";
import EditableCell from "../../components/EditableCell";
import { ArrowUp, ArrowDown } from "lucide-react";

// REMOVED the broken import:
// import {
//   SortableHeader,
//   getSortIndicator,
// } from "../../components/SortableHeader";

const CustomersTab = ({ data, userId }) => {
  const dispatch = useDispatch();
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();

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
          {sortedCustomers.map((customer) => (
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

export default CustomersTab;
