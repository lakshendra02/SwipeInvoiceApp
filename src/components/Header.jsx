import React from "react";
import { Clipboard } from "lucide-react";

const Header = ({ userId }) => {
  const displayUserId = userId || "N/A";

  const copyToClipboard = () => {
    // A simple clipboard copy function
    const el = document.createElement("textarea");
    el.value = displayUserId;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy user ID");
    }
    document.body.removeChild(el);
  };

  return (
    <header className="mb-8">
      <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
        Swipe <span className="text-gray-900">Invoice Manager</span>
      </h1>
      <p className="text-gray-500 mt-1">
        Automated Data Extraction, Real-time Sync & Management
      </p>

      {/* User ID Display */}
      {userId && (
        <div className="text-xs text-gray-500 mt-2 flex items-center">
          User ID:
          <code className="ml-1 bg-gray-200 px-2 py-0.5 rounded-md text-gray-700 font-mono text-xs overflow-hidden max-w-xs">
            {displayUserId}
          </code>
          <button
            onClick={copyToClipboard}
            title="Copy User ID"
            className="ml-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Clipboard size={14} />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
