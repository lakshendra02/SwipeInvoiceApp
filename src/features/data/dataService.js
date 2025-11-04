// This file holds the AI extraction logic, separate from components.

const API_KEY = ""; // Required for Gemini API calls
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// --- Gemini API Schema & Extraction Logic -------------------------------------

/**
 * Defines the JSON schema that the Gemini API MUST return.
 */
const getOutputSchema = () => ({
  type: "OBJECT",
  properties: {
    invoices: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          serialNumber: { type: "STRING" },
          invoiceDate: { type: "STRING" },
          customer_id: { type: "STRING" },
          status: {
            type: "STRING",
            description: "e.g., 'Paid', 'Pending', 'Overdue'",
          },
          amountPending: {
            type: "NUMBER",
            description: "The amount left to be paid.",
          },
          lineItems: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                product_id: { type: "STRING" },
                qty: { type: "NUMBER" },
              },
              propertyOrdering: ["product_id", "qty"],
            },
          },
        },
        propertyOrdering: [
          "serialNumber",
          "invoiceDate",
          "customer_id",
          "status",
          "amountPending",
          "lineItems",
        ],
      },
    },
    products: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          name: { type: "STRING" },
          // --- NEW FIELD ADDED ---
          brand: {
            type: "STRING",
            description: "The brand or manufacturer (e.g., Apple, Sony)",
          },
          // --- END NEW FIELD ---
          quantity: { type: "NUMBER" },
          unitPrice: { type: "NUMBER" },
          tax: { type: "NUMBER" },
        },
        propertyOrdering: [
          "id",
          "name",
          "brand", // Added here
          "quantity",
          "unitPrice",
          "tax",
        ],
      },
    },
    customers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          name: { type: "STRING" },
          phone: { type: "STRING" },
          companyName: { type: "STRING" },
        },
        propertyOrdering: ["id", "name", "phone", "companyName"],
      },
    },
  },
  propertyOrdering: ["invoices", "products", "customers"],
});

/**
 * A retry mechanism with exponential backoff for API calls.
 */
const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`API returned status ${response.status}`);
      }
      console.warn(
        `API call failed with status ${response.status}. Retrying in ${backoff}ms...`
      );
    } catch (error) {
      if (i === retries - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, backoff));
    backoff *= 2;
  }
};

/**
 * Calls the Gemini API to extract structured data from a file.
 * @param {string} fileType - The file's original MIME type.
 * @param {string} data - The processed file data (base64 for image/pdf, text for excel).
 * @returns {Promise<object>} The structured JSON data.
 */
export const extractDataFromFile = async (fileType, data) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const schema = getOutputSchema();

  let systemPrompt = `You are an expert data extraction system.
  Your task is to analyze the provided file and extract all relevant information
  to populate a billing system.
  
  The data is organized into three categories: Invoices, Products, and Customers.
  
  CRITICAL:
  - You MUST link entities.
  - An invoice's "customer_id" MUST match the "id" of a customer in the 'customers' list.
  - A line item's "product_id" MUST match the "id" of a product in the 'products' list.
  - If a customer or product is new, create a new entry for it in the 'products' or 'customers' list.
  - If a customer or product already exists, REUSE its "id".
  - "id" fields should be a unique, descriptive slug (e.g., "customer_shounak_nextspeed", "product_iphone_16").
  - Do not extract a "total purchase amount" for customers; the app will calculate this.
  - Extract tax as a percentage number (e.g., 18 for 18%).
  - Extract 'companyName' for customers.
  - Extract 'brand' (manufacturer) for products.
  - Extract 'status' and 'amountPending' for invoices if available.
  
  If you receive text data from an Excel/CSV, it will be in CSV format. 
  Each row is a transaction. Use this text data to populate the JSON structure.
  
  You MUST return the data in the specified JSON schema.`;

  const payload = {
    contents: [{ parts: [] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  payload.contents[0].parts.push({ text: systemPrompt });

  if (fileType.startsWith("image/") || fileType === "application/pdf") {
    payload.contents[0].parts.push({
      inlineData: {
        mimeType: fileType,
        data: data,
      },
    });
  } else if (
    fileType.includes("excel") ||
    fileType.includes("spreadsheetml") ||
    fileType.includes("csv")
  ) {
    payload.contents[0].parts.push({
      text: "\n--- Excel/CSV Data ---\n" + data,
    });
  } else {
    throw new Error("Unsupported file type in extractDataFromFile.");
  }

  console.log("Sending payload to Gemini API...", payload);

  try {
    const result = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("API Response:", result);

    if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
      const jsonText = result.candidates[0].content.parts[0].text;
      return JSON.parse(jsonText);
    } else {
      throw new Error("Invalid response structure from API.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};

/**
 * Merges the extracted AI data with the existing data in the app state.
 */
export const processExtractedData = (existingData, extractedData) => {
  let newData = JSON.parse(JSON.stringify(existingData));

  // 1. Merge Customers
  extractedData.customers.forEach((cust) => {
    if (!newData.customers[cust.id]) {
      newData.customers[cust.id] = {
        ...cust,
        companyName: cust.companyName || "N/A",
        totalPurchaseAmount: 0,
        _missing: !cust.name || !cust.phone || !cust.companyName,
      };
    }
  });

  // 2. Merge Products
  extractedData.products.forEach((prod) => {
    if (!newData.products[prod.id]) {
      newData.products[prod.id] = {
        ...prod,
        // --- NEW FIELD ADDED ---
        brand: prod.brand || "N/A",
        _missing:
          !prod.name ||
          prod.unitPrice == null ||
          prod.quantity == null ||
          !prod.brand, // Added check here
        // --- END NEW FIELD ---
      };
    } else {
      newData.products[prod.id].quantity += prod.quantity;
      // If new data has a brand and old one didn't, update it
      if (
        (prod.brand && !newData.products[prod.id].brand) ||
        newData.products[prod.id].brand === "N/A"
      ) {
        newData.products[prod.id].brand = prod.brand;
      }
    }
  });

  // 3. Merge Invoices (and calculate totals)
  extractedData.invoices.forEach((inv) => {
    if (newData.invoices.some((i) => i.serialNumber === inv.serialNumber)) {
      console.warn(`Invoice ${inv.serialNumber} already exists. Skipping.`);
      return;
    }

    let invoiceTotal = 0;
    let customerName = "N/A";
    let companyName = "N/A";
    const processedLineItems = [];

    if (newData.customers[inv.customer_id]) {
      customerName = newData.customers[inv.customer_id].name;
      companyName = newData.customers[inv.customer_id].companyName;
    }

    inv.lineItems.forEach((item) => {
      const product = newData.products[item.product_id];
      if (!product) {
        console.warn(
          `Product ${item.product_id} not found for invoice ${inv.serialNumber}.`
        );
        return;
      }

      const taxRate = (product.tax || 0) / 100;
      const priceBeforeTax = product.unitPrice * item.qty;
      const taxAmount = priceBeforeTax * taxRate;
      const lineTotal = priceBeforeTax + taxAmount;

      invoiceTotal += lineTotal;

      processedLineItems.push({
        id: crypto.randomUUID(), // Unique ID for each line item
        product_id: item.product_id,
        qty: item.qty,
        productName: product.name,
        unitPrice: product.unitPrice,
        tax: product.tax || 0,
        totalAmount: lineTotal,
        _missing: product._missing,
      });
    });

    // --- Status Logic ---
    let finalStatus = "Paid"; // Default
    if (inv.status) {
      finalStatus = inv.status;
    } else if (inv.amountPending > 0) {
      finalStatus = "Pending";
    }
    // --- End Status Logic ---

    if (newData.customers[inv.customer_id]) {
      newData.customers[inv.customer_id].totalPurchaseAmount += invoiceTotal;
    }

    newData.invoices.push({
      id: crypto.randomUUID(), // Unique ID for the invoice
      serialNumber: inv.serialNumber,
      invoiceDate: inv.invoiceDate,
      customer_id: inv.customer_id,
      customerName: customerName,
      companyName: companyName,
      lineItems: processedLineItems,
      totalAmount: invoiceTotal,
      status: finalStatus,
      _missing:
        !inv.serialNumber || !inv.invoiceDate || !customerName || !companyName,
    });
  });

  console.log("Merged data:", newData);
  return newData;
};
