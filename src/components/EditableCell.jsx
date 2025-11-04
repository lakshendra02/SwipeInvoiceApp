import React, { useState, useEffect } from "react";

const EditableCell = ({ value, onSave, type = "text", isMissing = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleSave = () => {
    if (currentValue !== value) {
      onSave(currentValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave();
    }
    if (e.key === "Escape") {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type={type}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full px-2 py-1 border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`block w-full cursor-pointer rounded-md -mx-2 -my-1 px-2 py-1 ${
        isMissing
          ? "bg-yellow-100 ring-1 ring-red-400 text-red-700"
          : "hover:bg-gray-100"
      }`}
    >
      {value != null ? value : "N/A"}
    </span>
  );
};

export default EditableCell;
