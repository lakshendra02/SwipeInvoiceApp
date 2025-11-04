import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// --- DOM NESTING FIX: This component now returns a <td> ---
const EditableCell = ({
  id,
  field,
  value,
  onSave,
  type = "text",
  missing = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    // Check if value actually changed
    if (currentValue !== value) {
      onSave(
        id,
        field,
        type === "number" ? Number(currentValue) : currentValue
      );
    }
  };

  const handleChange = (e) => {
    setCurrentValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  const cellClasses =
    "px-4 py-3 whitespace-nowrap text-sm text-gray-700 relative";

  if (isEditing) {
    return (
      <td className={cellClasses}>
        <input
          type={type}
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full p-1 border border-indigo-500 rounded-md shadow-sm outline-none"
        />
      </td>
    );
  }

  return (
    <td
      className={`${cellClasses} cursor-cell`}
      onClick={() => setIsEditing(true)}
    >
      {missing && (
        <AlertTriangle
          size={14}
          className="inline mr-1 text-yellow-500"
          title="This data was missing and may be incomplete."
        />
      )}
      {value}
    </td>
  );
};

export default EditableCell;
