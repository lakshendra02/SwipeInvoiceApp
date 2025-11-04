import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import {
  db,
  getCollectionPath,
  getDocPath,
} from "../../firebase/firebaseConfig";

const initialDataState = {
  invoices: [],
  products: {},
  customers: {},
};

export const firestoreApi = createApi({
  reducerPath: "firestoreApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Data"],
  endpoints: (builder) => ({
    getData: builder.query({
      queryFn: (userId) => {
        return new Promise((resolve) => {
          const docRef = doc(db, getCollectionPath(userId), getDocPath(userId));

          const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
              if (docSnap.exists()) {
                resolve({ data: docSnap.data() });
              } else {
                resolve({ data: initialDataState });
              }
            },
            (error) => {
              console.error("Firestore onSnapshot error:", error);
              resolve({ error: error.message });
            }
          );

          return { unsubscribe };
        });
      },
      providesTags: ["Data"],
    }),

    updateData: builder.mutation({
      queryFn: async ({ userId, newData }) => {
        try {
          const docRef = doc(db, getCollectionPath(userId), getDocPath(userId));
          await setDoc(docRef, newData);
          return { data: newData };
        } catch (error) {
          console.error("Firestore setDoc error:", error);
          return { error: error.message };
        }
      },
      invalidatesTags: ["Data"],
    }),
  }),
});

export const { useGetDataQuery, useUpdateDataMutation } = firestoreApi;
