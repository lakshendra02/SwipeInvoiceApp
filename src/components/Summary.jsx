import React from "react";
import { Clipboard, AlertTriangle } from "lucide-react";

const Summary = ({ data }) => {
  const invoiceCount = data.invoices.length;
  const productCount = Object.keys(data.products).length;
  const customerCount = Object.keys(data.customers).length;

  // Check for any missing data flags
  const showWarning =
    Object.values(data.products).some((p) => p._missing) ||
    Object.values(data.customers).some((c) => c._missing) ||
    data.invoices.some((i) => i._missing);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Clipboard size={20} className="mr-2 text-indigo-500" />
        Data Summary
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-indigo-50 p-4 rounded-lg shadow-inner">
          <p className="text-2xl font-bold text-indigo-600">{invoiceCount}</p>
          <p className="text-sm text-indigo-500">Invoices</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg shadow-inner">
          <p className="text-2xl font-bold text-indigo-600">{productCount}</p>
          <p className="text-sm text-indigo-500">Unique Products</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg shadow-inner">
          <p className="text-2xl font-bold text-indigo-600">{customerCount}</p>
          <p className="text-sm text-indigo-500">Customers</p>
        </div>
      </div>

      {/* Missing Data Warning */}
      {showWarning && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg flex items-center text-sm">
          <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
          <span className="font-semibold">Missing Data:</span> Review
          highlighted fields in the tables.
        </div>
      )}
    </div>
  );
};

export default Summary;
