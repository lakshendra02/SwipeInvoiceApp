import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "../features/data/dataSlice";
import { firestoreApi } from "../features/data/firestoreApi";

export const store = configureStore({
  reducer: {
    data: dataReducer,

    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(firestoreApi.middleware),
});
