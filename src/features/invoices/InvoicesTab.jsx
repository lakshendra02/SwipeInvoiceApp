import React from "react";
import { useUpdateDataMutation } from "../data/firestoreApi";
import EditableCell from "../../components/EditableCell";
import { AlertTriangle } from "lucide-react";

const RequiredMarker = () => (
  <span className="text-red-500 font-bold ml-1">*</span>
);

const InvoicesTab = ({ data, userId }) => {
  const { invoices, products, customers } = data;
  const [updateData] = useUpdateDataMutation();

  // Flatten the invoices and their line items
  const flattenedInvoices = invoices.flatMap((invoice) =>
    invoice.lineItems.map((item) => ({
      ...item,
      invoiceId: invoice.id,
      serialNumber: invoice.serialNumber,
      date: invoice.date,
      customer_id: invoice.customer_id,
      invoiceTotal: invoice.totalAmount,
    }))
  );

  const totalInvoices = invoices.length;

  // This function creates the *entire new state* and sends it to Firestore
  const handleUpdate = (entityType, id, field, newValue) => {
    // Create a deep copy to avoid mutation
    let newData = JSON.parse(JSON.stringify(data));
    let entityUpdated = false;

    if (entityType === "products") {
      if (newData.products[id]) {
        newData.products[id][field] = newValue;
        entityUpdated = true;

        // SYNC: Update all invoices that use this product
        newData.invoices.forEach((invoice) => {
          invoice.lineItems.forEach((item) => {
            if (item.product_id === id) {
              if (field === "name") item.productName = newValue;
              if (field === "unitPrice") item.unitPrice = newValue;
              // Recalculate totals if needed...
            }
          });
        });
      }
    } else if (entityType === "customers") {
      if (newData.customers[id]) {
        newData.customers[id][field] = newValue;
        entityUpdated = true;

        // SYNC: Update all invoices for this customer
        newData.invoices.forEach((invoice) => {
          if (invoice.customer_id === id) {
            if (field === "name") invoice.customerName = newValue;
          }
        });
      }
    }

    if (entityUpdated) {
      updateData({ userId, newData });
    }
  };

  return (
    <div className="p-4 bg-white rounded-b-lg shadow-xl">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Invoices ({totalInvoices})
      </h2>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Serial No.
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Date
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Customer
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Product
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Qty
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Tax (%)
                <RequiredMarker />
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                Line Total
                <RequiredMarker />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {flattenedInvoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No invoice data yet.
                </td>
              </tr>
            ) : (
              flattenedInvoices.map((item) => {
                const customerName = customers[item.customer_id]?.name || "N/A";
                const productName = products[item.product_id]?.name || "N/A";
                const isMissing =
                  item._missing || !customerName || !productName;

                return (
                  <tr
                    key={item.id}
                    className={`${
                      isMissing ? "bg-yellow-50" : "hover:bg-indigo-50"
                    } transition-colors`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      {item.serialNumber}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      {item.date}
                    </td>

                    {/* Editable Customer Name */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      <EditableCell
                        value={customerName}
                        onSave={(v) =>
                          handleUpdate("customers", item.customer_id, "name", v)
                        }
                        label="Customer Name"
                        isMissing={!customerName || customerName === "N/A"}
                      />
                    </td>

                    {/* Editable Product Name */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      <EditableCell
                        value={productName}
                        onSave={(v) =>
                          handleUpdate("products", item.product_id, "name", v)
                        }
                        label="Product Name"
                        isMissing={!productName || productName === "N/A"}
                      />
                    </td>

                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      {item.qty}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      {item.tax}%
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${item.totalAmount.toFixed(2)}
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

export default InvoicesTab;
