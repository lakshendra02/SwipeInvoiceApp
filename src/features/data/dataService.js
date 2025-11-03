// This file holds the AI extraction logic, separate from components.

const API_KEY = ""; // Required for Gemini API calls
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// --- Gemini API Schema & Extraction Logic -------------------------------------

/**
 * Defines the JSON schema that the Gemini API MUST return.
 * This is the most important part of the prompt, as it ensures
 * we get structured, predictable data.
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
          quantity: { type: "NUMBER" },
          unitPrice: { type: "NUMBER" },
          tax: { type: "NUMBER" },
        },
        propertyOrdering: ["id", "name", "quantity", "unitPrice", "tax"],
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
        },
        propertyOrdering: ["id", "name", "phone"],
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
      // Don't retry on client errors (4xx), but do on server errors (5xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`API returned status ${response.status}`);
      }
      // Log retry and wait
      console.warn(
        `API call failed with status ${response.status}. Retrying in ${backoff}ms...`
      );
    } catch (error) {
      if (i === retries - 1) throw error; // Re-throw last error
    }
    await new Promise((resolve) => setTimeout(resolve, backoff));
    backoff *= 2; // Exponential backoff
  }
};

/**
 * Calls the Gemini API to extract structured data from a file.
 * @param {string} fileType - 'image/png', 'application/pdf', etc.
 * @param {string} data - Base64 encoded string of the file.
 * @returns {Promise<object>} The structured JSON data.
 */
export const extractDataFromFile = async (fileType, data) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const schema = getOutputSchema();
  const fileMimeType = fileType.split("/")[0]; // 'image' or 'application'

  let systemPrompt = `You are an expert data extraction system.
  Your task is to analyze the provided file and extract all relevant information
  to populate a billing system.
  
  The data is organized into three categories: Invoices, Products, and Customers.
  - Invoices contain line items.
  - Products have details and pricing.
  - Customers have contact info.
  
  CRITICAL:
  - You MUST link entities.
  - An invoice's "customer_id" MUST match the "id" of a customer in the 'customers' list.
  - A line item's "product_id" MUST match the "id" of a product in the 'products' list.
  - If a customer or product is new, create a new entry for it in the 'products' or 'customers' list.
  - If a customer or product already exists (e.g., in a different invoice), REUSE its "id".
  - "id" fields should be a unique, descriptive slug (e.g., "customer_john_doe", "product_widget_blue").
  - Do not extract a "total purchase amount" for customers; the app will calculate this.
  - Extract tax as a percentage number (e.g., 18 for 18%).
  
  You MUST return the data in the specified JSON schema.`;

  // Build the payload
  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType: fileType,
              data: data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  // Handle text-based files (e.g., Excel/CSV text)
  // We'd add logic here to convert CSV to text and send a different prompt
  if (fileMimeType === "application" && fileType !== "application/pdf") {
    // This is a placeholder. For a real app, we'd parse the text/CSV
    // and send it as a text-only prompt.
    console.warn("Text file upload not fully implemented in demo.");
    // For now, we'll just throw an error
    throw new Error("Excel/CSV file processing is not set up in this demo.");
  }

  console.log("Sending payload to Gemini API...", payload);

  // Make the API call with retry logic
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
    throw error; // Re-throw to be caught by the component
  }
};

/**
 * Merges the extracted AI data with the existing data in the app state.
 * @param {object} existingData - The current state (data_summary doc).
 * @param {object} extractedData - The new data from the Gemini API.
 * @returns {object} The new, merged data_summary object.
 */
export const processExtractedData = (existingData, extractedData) => {
  // Create a deep copy to avoid mutating state
  let newData = JSON.parse(JSON.stringify(existingData));

  // 1. Merge Customers
  extractedData.customers.forEach((cust) => {
    if (!newData.customers[cust.id]) {
      newData.customers[cust.id] = {
        ...cust,
        totalPurchaseAmount: 0, // Will be calculated later
        _missing: !cust.name || !cust.phone,
      };
    }
  });

  // 2. Merge Products
  extractedData.products.forEach((prod) => {
    if (!newData.products[prod.id]) {
      newData.products[prod.id] = {
        ...prod,
        _missing: !prod.name || prod.unitPrice == null || prod.quantity == null,
      };
    } else {
      // If product exists, just add to its quantity
      newData.products[prod.id].quantity += prod.quantity;
    }
  });

  // 3. Merge Invoices (and calculate totals)
  extractedData.invoices.forEach((inv) => {
    // Check if this invoice serialNumber already exists
    if (newData.invoices.some((i) => i.serialNumber === inv.serialNumber)) {
      console.warn(`Invoice ${inv.serialNumber} already exists. Skipping.`);
      return;
    }

    let invoiceTotal = 0;
    let customerName = "N/A";
    const processedLineItems = [];

    // Find the customer for this invoice
    if (newData.customers[inv.customer_id]) {
      customerName = newData.customers[inv.customer_id].name;
    }

    inv.lineItems.forEach((item) => {
      const product = newData.products[item.product_id];
      if (!product) {
        console.warn(
          `Product ${item.product_id} not found for invoice ${inv.serialNumber}.`
        );
        return;
      }

      // Calculate totals for this line item
      const taxRate = (product.tax || 0) / 100;
      const priceBeforeTax = product.unitPrice * item.qty;
      const taxAmount = priceBeforeTax * taxRate;
      const lineTotal = priceBeforeTax + taxAmount;

      invoiceTotal += lineTotal;

      processedLineItems.push({
        ...item, // product_id, qty
        productName: product.name,
        unitPrice: product.unitPrice,
        tax: product.tax || 0,
        totalAmount: lineTotal,
        _missing: product._missing,
      });
    });

    // Update customer's total purchase amount
    if (newData.customers[inv.customer_id]) {
      newData.customers[inv.customer_id].totalPurchaseAmount += invoiceTotal;
    }

    // Add the fully processed invoice
    newData.invoices.push({
      ...inv, // serialNumber, invoiceDate, customer_id
      customerName: customerName,
      lineItems: processedLineItems,
      totalAmount: invoiceTotal,
      _missing: !inv.serialNumber || !inv.invoiceDate || !customerName,
    });
  });

  console.log("Merged data:", newData);
  return newData;
};
