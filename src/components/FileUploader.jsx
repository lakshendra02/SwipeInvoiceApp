import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileUp, Loader2, XCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
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

const fileToData = (file) => {
  return new Promise((resolve, reject) => {
    const fileType = file.type;
    const reader = new FileReader();

    if (fileType.startsWith("image/") || fileType === "application/pdf") {
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    } else if (
      fileType.includes("excel") ||
      fileType.includes("spreadsheetml") ||
      fileType.includes("csv")
    ) {
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          resolve(csvText);
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
  const [files, setFiles] = useState([]);
  const dispatch = useDispatch();

  const isUploading = useSelector(selectIsUploading);
  const uploadError = useSelector(selectUploadError);
  const uploadSuccessMessage = useSelector(selectUploadSuccessMessage);

  const [updateData, { isLoading: isUpdating }] = useUpdateDataMutation();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      dispatch(clearUploadMessage());
    } else {
      setFiles([]);
    }
  };

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
      const extractionPromises = files.map(async (file) => {
        try {
          const fileData = await fileToData(file);
          const fileType = file.type;
          return await extractDataFromFile(fileType, fileData);
        } catch (fileError) {
          console.error(`Failed to process ${file.name}:`, fileError);

          return {
            _fileError: true,
            fileName: file.name,
            message: fileError.message,
          };
        }
      });

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

      let finalData = JSON.parse(JSON.stringify(currentData));

      for (const extractedData of successfulExtractions) {
        finalData = processExtractedData(finalData, extractedData);
      }

      await updateData({ userId, newData: finalData }).unwrap();

      let successMessage = `Successfully processed ${successfulExtractions.length} file(s).`;
      if (failedFiles.length > 0) {
        dispatch(
          setUploadError(
            `Failed to process ${failedFiles.length} file(s): ${failedFiles
              .map((f) => f.fileName)
              .join(", ")}.`
          )
        );
        dispatch(setUploadSuccess(successMessage));
      } else {
        dispatch(setUploadSuccess(successMessage));
      }

      setFiles([]);
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
        <input
          id="file-upload"
          type="file"
          accept=".pdf, .jpg, .jpeg, .png, .xls, .xlsx, .csv"
          onChange={handleFileChange}
          multiple
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100 cursor-pointer"
        />

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
