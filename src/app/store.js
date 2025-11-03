import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "../features/data/dataSlice";
import { firestoreApi } from "../features/data/firestoreApi";

export const store = configureStore({
  reducer: {
    // This is for our local state (loading, error, etc.)
    data: dataReducer,

    // This is for RTK Query to manage data fetching/caching
    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  // Adding the RTK Query middleware
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(firestoreApi.middleware),
});
