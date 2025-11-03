import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileUp, Loader2, XCircle, CheckCircle } from "lucide-react";
import {
  setUploadLoading,
  setUploadError,
  setUploadSuccess,
  clearUploadMessage,
  selectIsUploading,
  selectUploadError,
  selectUploadSuccessMessage,
} from "../features/data/dataSlice";
import {
  extractDataFromFile,
  processExtractedData,
} from "../features/data/dataService";
import { useUpdateDataMutation } from "../features/data/firestoreApi";

/**
 * Utility function to convert a file to a base64 string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves with the base64 data.
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    // We only process image and PDF files for the Gemini API
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // Get just the base64 part
      reader.onerror = (error) => reject(error);
    } else {
      // Handle Excel or other types
      // For this project, we'll reject them as we're set up for vision/PDF
      reject(
        new Error("Unsupported file format. Please upload an image or PDF.")
      );
    }
  });
};

const FileUploader = ({ userId, currentData }) => {
  const [file, setFile] = useState(null);
  const dispatch = useDispatch();

  // Local UI state from Redux
  const isUploading = useSelector(selectIsUploading);
  const uploadError = useSelector(selectUploadError);
  const uploadSuccessMessage = useSelector(selectUploadSuccessMessage);

  // RTK Query mutation hook to update data
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      dispatch(clearUploadMessage());
    }
  };

  const handleUploadClick = async () => {
    if (!file) {
      dispatch(setUploadError("Please select a file first."));
      return;
    }
    if (!userId) {
      dispatch(setUploadError("User not authenticated."));
      return;
    }

    dispatch(setUploadLoading(true));
    try {
      // 1. Convert file to base64
      const base64Data = await fileToBase64(file);
      const fileType = file.type;

      // 2. Call AI Service with fileType and base64 data
      const extractedData = await extractDataFromFile(fileType, base64Data);

      // 3. Process and merge data
      const newData = processExtractedData(currentData, extractedData);

      // 4. Call RTK Mutation to save to Firestore
      await updateData({ userId, newData }).unwrap(); // unwrap() throws error on failure

      dispatch(setUploadSuccess(`Successfully processed ${file.name}.`));
      setFile(null); // Clear file input
      const fileInput = document.getElementById("file-upload");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Upload failed:", err);
      dispatch(
        setUploadError(err.message || "An unknown extraction error occurred.")
      );
    }
  };

  const isLoading = isUploading || isUpdating;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <FileUp size={20} className="mr-2 text-indigo-500" />
        AI-Powered Data Extraction
      </h3>
      <div className="flex flex-col space-y-4">
        {/* File Input */}
        <input
          id="file-upload"
          type="file"
          accept=".pdf, .jpg, .jpeg, .png" // Updated accept string
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100 cursor-pointer"
        />

        {/* Upload Button */}
        <button
          onClick={handleUploadClick}
          disabled={!file || isLoading}
          className={`w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white transition-all
            ${
              !file || isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" /> Extracting &
              Saving...
            </>
          ) : (
            `Upload & Extract: ${file ? file.name : "Select File"}`
          )}
        </button>
      </div>

      {/* Messages */}
      {(uploadSuccessMessage || uploadError) && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-start text-sm ${
            uploadSuccessMessage
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {uploadSuccessMessage ? (
            <CheckCircle size={16} className="mt-0.5 mr-2" />
          ) : (
            <XCircle size={16} className="mt-0.5 mr-2" />
          )}
          <div>
            <p className="font-medium">{uploadSuccessMessage || uploadError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
