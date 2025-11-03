import React, { useState } from "react";
import { Pencil, Save, AlertTriangle } from "lucide-react";

const EditableCell = ({ value, onSave, label, isMissing }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    onSave(localValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-1">
        <input
          type={typeof value === "number" ? "number" : "text"}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="border border-indigo-300 rounded p-1 text-sm w-full min-w-[100px] focus:ring-2 focus:ring-indigo-500"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
        >
          <Save size={16} />
        </button>
      </div>
    );
  }

  const displayValue = value === null || value === undefined ? "N/A" : value;
  const missing = isMissing || displayValue === "N/A";

  return (
    <div
      className={`flex items-center group cursor-pointer p-1 rounded ${
        missing
          ? "bg-yellow-100/50 text-red-600 font-medium border border-yellow-300"
          : ""
      }`}
      onClick={() => setIsEditing(true)}
    >
      <span>{displayValue}</span>
      {missing && (
        <AlertTriangle
          size={14}
          className="ml-1 text-yellow-600"
          title={`Missing required field: ${label}`}
        />
      )}
      <Pencil
        size={12}
        className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
};

export default EditableCell;
