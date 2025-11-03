import React from "react";
import { Users, Box, Receipt } from "lucide-react";

// Reusable Tab Button
const TabButton = ({ isActive, icon, children, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors duration-200 border-b-2
      ${
        isActive
          ? "border-indigo-600 text-indigo-700 bg-indigo-50 shadow-inner"
          : "border-transparent text-gray-500 hover:text-indigo-600 hover:border-gray-300"
      } rounded-t-lg`}
  >
    {icon}
    <span>{children}</span>
  </button>
);

const TabNavigation = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b border-gray-200">
      <TabButton
        isActive={activeTab === "invoices"}
        onClick={() => setActiveTab("invoices")}
        icon={<Receipt size={18} />}
      >
        Invoices
      </TabButton>
      <TabButton
        isActive={activeTab === "products"}
        onClick={() => setActiveTab("products")}
        icon={<Box size={18} />}
      >
        Products
      </TabButton>
      <TabButton
        isActive={activeTab === "customers"}
        onClick={() => setActiveTab("customers")}
        icon={<Users size={18} />}
      >
        Customers
      </TabButton>
    </div>
  );
};

export default TabNavigation;
