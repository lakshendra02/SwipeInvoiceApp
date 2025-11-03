import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import {
  db,
  getCollectionPath,
  getDocPath,
} from "../../firebase/firebaseConfig";

// This is the initial state if no document is found in Firestore
const initialDataState = {
  invoices: [],
  products: {},
  customers: {},
};

// Define an RTK Query API for Firestore
export const firestoreApi = createApi({
  reducerPath: "firestoreApi",
  baseQuery: fakeBaseQuery(), // Use fakeBaseQuery for non-fetch APIs
  tagTypes: ["Data"], // Tag for caching
  endpoints: (builder) => ({
    // Endpoint to get the data summary document
    getData: builder.query({
      queryFn: (userId) => {
        // queryFn must return a promise
        return new Promise((resolve) => {
          const docRef = doc(db, getCollectionPath(userId), getDocPath(userId));

          // Use onSnapshot to listen for real-time updates
          const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
              if (docSnap.exists()) {
                resolve({ data: docSnap.data() });
              } else {
                // Return the initial state if doc doesn't exist
                resolve({ data: initialDataState });
              }
            },
            (error) => {
              console.error("Firestore onSnapshot error:", error);
              resolve({ error: error.message });
            }
          );

          // Return a cleanup function to stop listening
          return { unsubscribe };
        });
      },
      // Provides the 'Data' tag for invalidation
      providesTags: ["Data"],
    }),

    // Endpoint to update the data summary document
    updateData: builder.mutation({
      queryFn: async ({ userId, newData }) => {
        try {
          const docRef = doc(db, getCollectionPath(userId), getDocPath(userId));
          await setDoc(docRef, newData);
          return { data: newData }; // Return the new data
        } catch (error) {
          console.error("Firestore setDoc error:", error);
          return { error: error.message };
        }
      },
      // Invalidates the 'Data' tag to force a refetch (or update from snapshot)
      invalidatesTags: ["Data"],
    }),
  }),
});

// Export hooks
export const { useGetDataQuery, useUpdateDataMutation } = firestoreApi;
