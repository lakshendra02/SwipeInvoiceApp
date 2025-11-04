import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isUploading: false,
  uploadError: null,
  uploadSuccessMessage: null,
  activeTab: "invoices",
};

export const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
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
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
  },
});

export const {
  setUploadLoading,
  setUploadError,
  setUploadSuccess,
  clearUploadMessage,
  setActiveTab,
} = dataSlice.actions;

export const selectIsUploading = (state) => state.data.isUploading;
export const selectUploadError = (state) => state.data.uploadError;
export const selectUploadSuccessMessage = (state) =>
  state.data.uploadSuccessMessage;
export const selectActiveTab = (state) => state.data.activeTab;

export default dataSlice.reducer;
