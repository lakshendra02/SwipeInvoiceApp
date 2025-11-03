// This file holds the AI extraction logic, separate from components.

const API_KEY = ""; // Required for Gemini API calls
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// --- Utility Functions ------------------------------------------------------
const fileToBase64 = (file) => {
  // ... (Same fileToBase64 function as the single-file app)
  return new Promise((resolve, reject) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    } else {
      // Mocking PDF/Excel
      resolve(`MOCK_BASE64_FOR_${file.type.split("/")[1]}`);
    }
  });
};

const getOutputSchema = () => {
  // ... (Same getOutputSchema function as the single-file app)
  return {
    type: "OBJECT",
    properties: {
      invoiceDate: {
        type: "STRING",
        description: "The date of the invoice (YYYY-MM-DD).",
      },
      serialNumber: {
        type: "STRING",
        description: "The invoice serial or ID number.",
      },
      customer: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", description: "Customer full name." },
          phone: {
            type: "STRING",
            description: "Customer phone number, if available.",
          },
        },
      },
      items: {
        type: "ARRAY",
        description: "List of products/services on the invoice.",
        items: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: "Product name or description.",
            },
            quantity: {
              type: "NUMBER",
              description: "Quantity of the product.",
            },
            unitPrice: {
              type: "NUMBER",
              description: "Unit price before tax/discount.",
            },
            taxRate: {
              type: "NUMBER",
              description:
                "Applicable tax rate as a percentage (e.g., 5 for 5%).",
            },
          },
          required: ["name", "quantity", "unitPrice", "taxRate"],
        },
      },
      totalAmount: {
        type: "NUMBER",
        description: "Final total amount including tax and discounts.",
      },
    },
    required: [
      "invoiceDate",
      "serialNumber",
      "customer",
      "items",
      "totalAmount",
    ],
  };
};

// --- Main Extraction Service ------------------------------------------------
/**
 * Processes a file, calls Gemini API, and returns structured data.
 * @param {File} file The file to upload.
 * @returns {Promise<object>} The extracted JSON data.
 */
export const extractDataFromFile = async (file) => {
  let parts = [];
  let mimeType = file.type;
  let base64Data = null;
  let prompt = "";

  // 1. Convert file to parts for Gemini API
  if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
    base64Data = await fileToBase64(file);

    if (base64Data.startsWith("MOCK_BASE64")) {
      prompt = `Extract all invoice details from this document... (Mock PDF/Excel Text)`;
      parts.push({ text: prompt });
    } else {
      prompt = `Analyze this image of an invoice. Extract... (Image Prompt)`;
      parts.push({ text: prompt });
      parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
    }
  } else if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    prompt = `Analyze the following transaction data from an Excel file... (Excel Prompt)`;
    parts.push({ text: prompt });
  } else {
    throw new Error("Unsupported file format.");
  }

  // 2. Prepare the API Payload
  const payload = {
    contents: [{ role: "user", parts: parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: getOutputSchema(),
    },
  };

  // 3. Call the Gemini API (with Exponential Backoff)
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw new Error(`API returned status ${response.status}`);

      const result = await response.json();
      const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (jsonText) {
        return JSON.parse(jsonText); // Success
      } else {
        throw new Error("API response text was empty or malformed.");
      }
    } catch (e) {
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw e; // Final error
      }
    }
  }
  throw new Error("Failed to get a structured response after retries.");
};

// --- Data Processing Logic ------------------------------------------------
/**
 * Merges new extracted data with the existing data state.
 * @param {object} extractedData The new data from Gemini.
 * @param {object} currentData The current data state from Firestore.
 * @returns {object} The new, merged data state.
 */
export const processExtractedData = (extractedData, currentData) => {
  let newInvoices = [...currentData.invoices];
  let newProducts = { ...currentData.products };
  let newCustomers = { ...currentData.customers };

  const data = extractedData; // Data is already parsed JSON

  const customerId = data.serialNumber + (data.customer.phone || "no-phone");
  const invoiceId = data.serialNumber + "-" + Date.now();

  // 1. Process Customer
  if (!newCustomers[customerId]) {
    newCustomers[customerId] = {
      id: customerId,
      name: data.customer.name,
      phone: data.customer.phone || "N/A",
      totalPurchaseAmount: 0,
      _missing: !data.customer.name || !data.customer.phone,
    };
  }

  // 2. Process Products and Invoice Line Items
  let invoiceTotal = 0;
  const lineItems = data.items.map((item) => {
    const productId =
      item.name.toLowerCase().replace(/\s/g, "_") + "-" + item.unitPrice;
    const unitPrice = item.unitPrice || 0;
    const quantity = item.quantity || 0;
    const taxRate = item.taxRate / 100 || 0;
    const priceBeforeTax = unitPrice * quantity;
    const taxAmount = priceBeforeTax * taxRate;
    const priceWithTax = priceBeforeTax + taxAmount;

    if (!newProducts[productId]) {
      newProducts[productId] = {
        id: productId,
        name: item.name,
        quantity: quantity,
        unitPrice: unitPrice,
        tax: taxRate * 100,
        _missing: !item.name || !item.unitPrice || !item.quantity,
      };
    } else {
      newProducts[productId].quantity += quantity;
    }
    invoiceTotal += priceWithTax;

    return {
      id: crypto.randomUUID(),
      product_id: productId,
      productName: item.name,
      qty: quantity,
      tax: taxRate * 100,
      totalAmount: priceWithTax,
      unitPrice: unitPrice,
      _missing: newProducts[productId]._missing,
    };
  });

  // 3. Create Invoice Record
  const newInvoiceRecord = {
    id: invoiceId,
    serialNumber: data.serialNumber,
    customer_id: customerId,
    customerName: data.customer.name,
    totalAmount: data.totalAmount || invoiceTotal,
    date: data.invoiceDate,
    lineItems: lineItems,
    _missing: !data.serialNumber || !data.invoiceDate || !data.totalAmount,
  };
  newInvoices.push(newInvoiceRecord);

  // 4. Update Customer Total
  newCustomers[customerId].totalPurchaseAmount += newInvoiceRecord.totalAmount;

  // 5. Return the new complete state
  return {
    invoices: newInvoices,
    products: newProducts,
    customers: newCustomers,
  };
};
