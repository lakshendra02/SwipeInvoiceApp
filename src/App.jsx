import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { authenticateUser, auth } from "./firebase/firebaseConfig";
import { useGetDataQuery } from "./features/data/firestoreApi";
import { selectIsUploading } from "./features/data/dataSlice";

// Lazy load components for better performance
const FileUploader = React.lazy(() => import("./components/FileUploader"));
const Header = React.lazy(() => import("./components/Header"));
const Summary = React.lazy(() => import("./components/Summary"));
const InvoicesTab = React.lazy(() => import("./features/invoices/InvoicesTab"));
const ProductsTab = React.lazy(() => import("./features/products/ProductsTab"));
const CustomersTab = React.lazy(() =>
  import("./features/customers/CustomersTab")
);
const TabNavigation = React.lazy(() => import("./components/TabNavigation"));

function App() {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");

  // Authenticate user on app load
  useEffect(() => {
    authenticateUser()
      .then((uid) => {
        setUserId(uid);
        setIsAuthReady(true);
      })
      .catch((error) => {
        console.error("Auth failed:", error);
        setIsAuthReady(true); // Still ready, but with no user
      });
  }, []);

  // Use RTK Query to fetch data. It handles loading, error, and caching.
  const {
    data: allData,
    isLoading: isDataLoading,
    error: dataError,
  } = useGetDataQuery(userId, {
    skip: !isAuthReady || !userId, // Don't fetch until auth is ready
  });

  const isUploading = useSelector(selectIsUploading);

  // Loading state
  if (!isAuthReady || (isDataLoading && !allData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 size={24} className="animate-spin mr-2 text-indigo-500" />
        <span className="text-indigo-600 font-medium">
          {!isAuthReady ? "Authenticating..." : "Loading Data..."}
        </span>
      </div>
    );
  }

  // Error state
  if (dataError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="text-red-600 font-medium">
          Error loading data: {dataError.message}
        </span>
      </div>
    );
  }

  // Ensure allData is not null/undefined before passing
  const safeData = allData || { invoices: [], products: {}, customers: {} };

  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Loader2 size={24} className="animate-spin mr-2 text-indigo-500" />
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-inter">
        <Header userId={userId} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <FileUploader userId={userId} currentData={safeData} />
          </div>
          <div className="lg:col-span-2">
            <Summary data={safeData} />
          </div>
        </div>

        {/* Tab Navigation and Content */}
        <div className="w-full">
          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="mt-4">
            {activeTab === "invoices" && (
              <InvoicesTab data={safeData} userId={userId} />
            )}
            {activeTab === "products" && (
              <ProductsTab data={safeData} userId={userId} />
            )}
            {activeTab === "customers" && (
              <CustomersTab data={safeData} userId={userId} />
            )}
          </div>
        </div>
      </div>
    </React.Suspense>
  );
}

export default App;
