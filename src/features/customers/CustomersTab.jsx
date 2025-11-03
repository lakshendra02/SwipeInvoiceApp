import React from "react";
import { useUpdateDataMutation } from "../data/firestoreApi";
import EditableCell from "../../components/EditableCell";
import { AlertTriangle } from "lucide-react";

// Marker for required fields in the header
const RequiredMarker = () => (
  <span className="text-red-500 font-bold ml-1">*</span>
);

const CustomersTab = ({ data, userId }) => {
  const { invoices, products, customers } = data;
  const [updateData] = useUpdateDataMutation();

  // Convert customers object to an array for mapping
  const customerList = Object.values(customers);

  // This function creates the *entire new state* and sends it to Firestore
  const handleUpdate = (customerId, field, newValue) => {
    // Create a deep copy to avoid mutating the original state
    let newData = JSON.parse(JSON.stringify(data));
    let customerUpdated = false;

    if (newData.customers[customerId]) {
      newData.customers[customerId][field] = newValue;

      // Check if a required field is now filled
      const cust = newData.customers[customerId];
      cust._missing = !cust.name || !cust.phone;

      customerUpdated = true;

      // SYNC: Update all invoices for this customer
      newData.invoices.forEach((invoice) => {
        if (invoice.customer_id === customerId) {
          if (field === "name") {
            invoice.customerName = newValue;
            // Check if this invoice is missing data
            invoice._missing =
              !invoice.serialNumber ||
              !invoice.invoiceDate ||
              !invoice.totalAmount;
          }
        }
      });
    }

    if (customerUpdated) {
      updateData({ userId, newData });
    }
  };

  return (
    <div className="p-4 bg-white rounded-b-lg shadow-xl">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Customers ({customerList.length})
      </h2>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Customer Name
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Phone Number
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Total Purchase Amount
                <RequiredMarker />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {customerList.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  No customer data yet.
                </td>
              </tr>
            ) : (
              customerList.map((customer) => {
                const isMissing =
                  customer._missing || !customer.name || !customer.phone;

                return (
                  <tr
                    key={customer.id}
                    className={`${
                      isMissing ? "bg-yellow-50" : "hover:bg-indigo-50"
                    } transition-colors`}
                  >
                    {/* Editable Name */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      <EditableCell
                        value={customer.name}
                        onSave={(v) => handleUpdate(customer.id, "name", v)}
                        label="Customer Name"
                        isMissing={!customer.name}
                      />
                    </td>

                    {/* Editable Phone */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      <EditableCell
                        value={customer.phone}
                        onSave={(v) => handleUpdate(customer.id, "phone", v)}
                        label="Phone Number"
                        isMissing={!customer.phone}
                      />
                    </td>

                    {/* Non-Editable Computed Column */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${(customer.totalPurchaseAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersTab;
