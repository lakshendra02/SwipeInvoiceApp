import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isUploading: false,
  uploadError: null,
  uploadSuccessMessage: null,
};

export const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    // Reducers for managing local UI state (loading/errors)
    setUploadLoading: (state, action) => {
      state.isUploading = action.payload;
      state.uploadError = null;
      state.uploadSuccessMessage = null;
    },
    setUploadError: (state, action) => {
      state.isUploading = false;
      state.uploadError = action.payload;
      state.uploadSuccessMessage = null;
    },
    setUploadSuccess: (state, action) => {
      state.isUploading = false;
      state.uploadError = null;
      state.uploadSuccessMessage = action.payload;
    },
    clearUploadMessage: (state) => {
      state.uploadError = null;
      state.uploadSuccessMessage = null;
    },
  },
});

export const {
  setUploadLoading,
  setUploadError,
  setUploadSuccess,
  clearUploadMessage,
} = dataSlice.actions;

// Selectors
export const selectIsUploading = (state) => state.data.isUploading;
export const selectUploadError = (state) => state.data.uploadError;
export const selectUploadSuccessMessage = (state) =>
  state.data.uploadSuccessMessage;

export default dataSlice.reducer;
