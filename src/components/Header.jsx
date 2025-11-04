import React from "react";

const Header = ({ userId }) => {
  const displayUserId = userId || "N/A";

  return (
    <header className="mb-10 text-center select-none">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
        <span className="text-blue-600">Swipe</span> Invoice Manager
      </h1>

      <p className="text-gray-600 text-sm md:text-base mt-2 font-medium">
        Automated Data Extraction, Real-time Sync & Management
      </p>
    </header>
  );
};

export default Header;
