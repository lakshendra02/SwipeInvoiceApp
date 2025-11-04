import React, { useState } from "react";
import {
  List,
  Package,
  Users,
  AlertTriangle,
  Loader2,
  DatabaseZap, // Added icon
} from "lucide-react";
import { useMemo } from "react";
import { useUpdateDataMutation } from "../features/data/firestoreApi"; // Added mutation hook

// --- FIX: Added isLoading and userId props ---
const Summary = ({ data, isLoading, userId }) => {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();

  // --- FIX: Use default empty state and optional chaining to prevent crash ---
  const { invoices = [], products = {}, customers = {} } = data || {};

  const invoiceCount = invoices.length;
  const productCount = Object.keys(products).length;
  const customerCount = Object.keys(customers).length;

  // Check for any missing data
  const hasMissingData = useMemo(() => {
    if (!data) return false;
    const allEntities = [
      ...Object.values(products),
      ...Object.values(customers),
    ];
    return allEntities.some((entity) => entity._missing);
  }, [data, products, customers]);

  // --- NEW: Function to reset the database ---
  const handleConfirmReset = async () => {
    if (!userId) {
      console.error("Cannot reset: User ID is not available.");
      return;
    }
    const emptyData = {
      invoices: [],
      products: {},
      customers: {},
    };
    try {
      await updateData({ userId, newData: emptyData }).unwrap();
      setIsConfirmingReset(false); // Hide confirmation buttons
    } catch (err) {
      console.error("Failed to reset database:", err);
    }
  };

  // --- FIX: Show loading skeletons ---
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Loader2 size={20} className="mr-2 text-indigo-500 animate-spin" />
          Loading Data Summary...
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        Data Summary
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={List}
          label="Invoices"
          value={invoiceCount}
          color="blue"
        />
        <StatCard
          icon={Package}
          label="Unique Products"
          value={productCount}
          color="purple"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={customerCount}
          color="green"
        />
      </div>

      {hasMissingData && (
        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg flex items-center text-sm border border-yellow-200">
          <AlertTriangle size={16} className="mr-2" />
          <span className="font-medium">Missing Data:</span>
          <span className="ml-1">Review highlighted fields in the tables.</span>
        </div>
      )}

      {/* --- NEW: Reset Database Button & Confirmation --- */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        {!isConfirmingReset ? (
          <button
            onClick={() => setIsConfirmingReset(true)}
            disabled={isUpdating}
            className="w-full flex justify-center items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <DatabaseZap size={16} className="mr-2" />
            Reset Database
          </button>
        ) : (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-900">
              Are you sure? This will delete all data.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleConfirmReset}
                disabled={isUpdating}
                className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Yes, Reset All Data"
                )}
              </button>
              <button
                onClick={() => setIsConfirmingReset(false)}
                disabled={isUpdating}
                className="flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {/* --- END: Reset Database Button --- */}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
  };
  return (
    <div
      className={`flex flex-col items-center p-4 rounded-lg ${colors[color]}`}
    >
      <Icon size={24} className="mb-2" />
      <span className="text-3xl font-bold">{value}</span>
      <span className="text-sm font-medium opacity-80">{label}</span>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="flex flex-col items-center p-4 rounded-lg bg-gray-100 animate-pulse">
    <div className="w-8 h-8 bg-gray-300 rounded-md mb-2"></div>
    <div className="w-12 h-8 bg-gray-300 rounded-md"></div>
    <div className="w-20 h-4 bg-gray-300 rounded-md mt-1"></div>
  </div>
);

export default Summary;
