import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileUp, Loader2, XCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx"; // Import the Excel library
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
 * Utility function to convert a file to the format needed by the AI.
 * - For images/PDFs, returns base64 string.
 * - For Excel files, returns a CSV text string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves with the data.
 */
const fileToData = (file) => {
  return new Promise((resolve, reject) => {
    const fileType = file.type;
    const reader = new FileReader();

    if (fileType.startsWith("image/") || fileType === "application/pdf") {
      // --- Image/PDF Path ---
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // Get just the base64 part
      reader.onerror = (error) => reject(error);
    } else if (
      fileType.includes("excel") ||
      fileType.includes("spreadsheetml") ||
      fileType.includes("csv")
    ) {
      // --- Excel/CSV Path ---
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          // Convert the sheet to a CSV text string
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          resolve(csvText); // Resolve with the text content
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
    } else {
      reject(
        new Error(
          `Unsupported file format: ${file.name}. Please upload an image, PDF, or Excel file.`
        )
      );
    }
  });
};

const FileUploader = ({ userId, currentData }) => {
  // --- STATE UPDATED ---
  // Hold an array of files, not just one
  const [files, setFiles] = useState([]);
  const dispatch = useDispatch();

  // Local UI state from Redux
  const isUploading = useSelector(selectIsUploading);
  const uploadError = useSelector(selectUploadError);
  const uploadSuccessMessage = useSelector(selectUploadSuccessMessage);

  // RTK Query mutation hook to update data
  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();

  // --- HANDLER UPDATED ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert the FileList object to a standard array
      setFiles(Array.from(e.target.files));
      dispatch(clearUploadMessage());
    } else {
      setFiles([]);
    }
  };

  // --- HANDLER UPDATED FOR MULTI-FILE ---
  const handleUploadClick = async () => {
    if (files.length === 0) {
      dispatch(setUploadError("Please select one or more files first."));
      return;
    }
    if (!userId) {
      dispatch(setUploadError("User not authenticated."));
      return;
    }

    dispatch(setUploadLoading(true));

    try {
      // 1. Create an array of processing promises.
      // This will convert and extract data from all files in parallel.
      const extractionPromises = files.map(async (file) => {
        try {
          const fileData = await fileToData(file);
          const fileType = file.type;
          return await extractDataFromFile(fileType, fileData);
        } catch (fileError) {
          // If one file fails, log it and return null
          console.error(`Failed to process ${file.name}:`, fileError);
          // Return a special marker to indicate failure for this file
          return {
            _fileError: true,
            fileName: file.name,
            message: fileError.message,
          };
        }
      });

      // 2. Wait for all files to be processed by the AI.
      const allExtractedData = await Promise.all(extractionPromises);

      const successfulExtractions = allExtractedData.filter(
        (data) => data && !data._fileError
      );
      const failedFiles = allExtractedData.filter(
        (data) => data && data._fileError
      );

      if (successfulExtractions.length === 0) {
        throw new Error(
          `All files failed to process. ${failedFiles
            .map((f) => f.fileName)
            .join(", ")}`
        );
      }

      // 3. Process and merge all successful results
      // Start with a deep copy of the current data
      let finalData = JSON.parse(JSON.stringify(currentData));

      // Loop through each successful extraction and merge it
      for (const extractedData of successfulExtractions) {
        finalData = processExtractedData(finalData, extractedData);
      }

      // 4. Call RTK Mutation ONCE to save all merged data
      await updateData({ userId, newData: finalData }).unwrap();

      // 5. Report success/failure
      let successMessage = `Successfully processed ${successfulExtractions.length} file(s).`;
      if (failedFiles.length > 0) {
        dispatch(
          setUploadError(
            `Failed to process ${failedFiles.length} file(s): ${failedFiles
              .map((f) => f.fileName)
              .join(", ")}.`
          )
        );
        // We set success AFTER error so the error message shows
        dispatch(setUploadSuccess(successMessage));
      } else {
        dispatch(setUploadSuccess(successMessage));
      }

      setFiles([]); // Clear file input
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
        {/* File Input --- UPDATED WITH 'multiple' --- */}
        <input
          id="file-upload"
          type="file"
          accept=".pdf, .jpg, .jpeg, .png, .xls, .xlsx, .csv"
          onChange={handleFileChange}
          multiple // <-- THIS IS THE KEY CHANGE
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100 cursor-pointer"
        />

        {/* Upload Button --- UPDATED --- */}
        <button
          onClick={handleUploadClick}
          disabled={files.length === 0 || isLoading}
          className={`w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white transition-all
            ${
              files.length === 0 || isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Extracting {files.length} file(s)...
            </>
          ) : (
            `Upload & Extract: ${
              files.length > 0
                ? `${files.length} file(s) selected`
                : "Select Files"
            }`
          )}
        </button>
      </div>

      {/* Messages */}
      {uploadError && (
        <div className="mt-4 p-3 rounded-lg flex items-start text-sm bg-red-100 text-red-800">
          <XCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">{uploadError}</p>
          </div>
        </div>
      )}
      {uploadSuccessMessage && (
        <div className="mt-4 p-3 rounded-lg flex items-start text-sm bg-green-100 text-green-800">
          <CheckCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">{uploadSuccessMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
