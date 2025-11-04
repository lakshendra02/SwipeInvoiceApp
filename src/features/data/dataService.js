const API_KEY = "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

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
          companyName: { type: "STRING" },
          status: { type: "STRING" },
          amountPending: { type: "NUMBER" },
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
          "companyName",
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
          brand: { type: "STRING" },
          discount: { type: "NUMBER" },
          quantity: { type: "NUMBER" },
          unitPrice: { type: "NUMBER" },
          tax: { type: "NUMBER" },
        },
        propertyOrdering: [
          "id",
          "name",
          "brand",
          "discount",
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

export const extractDataFromFile = async (fileType, data) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const schema = getOutputSchema();

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
- If a customer or product is new, create a new entry.
- If a customer or product already exists, REUSE its "id".
- Extract tax and discount as numeric values.
- Do not calculate totals; the app will compute values.
If Excel or CSV text is provided, extract values to match schema.`;

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
      inlineData: { mimeType: fileType, data },
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

export const processExtractedData = (existingData, extractedData) => {
  let newData = JSON.parse(JSON.stringify(existingData));

  extractedData.customers.forEach((cust) => {
    if (!newData.customers[cust.id]) {
      newData.customers[cust.id] = {
        ...cust,
        totalPurchaseAmount: 0,
        _missing: !cust.name || !cust.phone || !cust.companyName,
      };
    }
  });

  extractedData.products.forEach((prod) => {
    if (!newData.products[prod.id]) {
      newData.products[prod.id] = {
        ...prod,
        discount: prod.discount || 0,
        brand: prod.brand || "N/A",
        _missing: !prod.name || prod.unitPrice == null || prod.quantity == null,
      };
    } else {
      newData.products[prod.id].quantity += prod.quantity;
    }
  });

  extractedData.invoices.forEach((inv) => {
    if (newData.invoices.some((i) => i.serialNumber === inv.serialNumber)) {
      console.warn(`Invoice ${inv.serialNumber} already exists. Skipping.`);
      return;
    }

    let invoiceTotal = 0;
    let customerName = "N/A";
    let companyName = inv.companyName || "N/A";

    if (newData.customers[inv.customer_id]) {
      customerName = newData.customers[inv.customer_id].name;
      if (
        companyName === "N/A" &&
        newData.customers[inv.customer_id].companyName
      ) {
        companyName = newData.customers[inv.customer_id].companyName;
      }
    }

    const processedLineItems = [];
    inv.lineItems.forEach((item) => {
      const product = newData.products[item.product_id];
      if (!product) return;

      const taxRate = (product.tax || 0) / 100;
      const discountRate = (product.discount || 0) / 100;

      const priceAfterDiscount = (product.unitPrice || 0) * (1 - discountRate);
      const taxAmount = priceAfterDiscount * taxRate;
      const lineTotal = (priceAfterDiscount + taxAmount) * (item.qty || 0);

      invoiceTotal += lineTotal;

      processedLineItems.push({
        ...item,
        id: crypto.randomUUID(),
        productName: product.name,
        unitPrice: product.unitPrice || 0,
        tax: product.tax || 0,
        totalAmount: lineTotal,
        _missing: product._missing,
      });
    });

    let finalStatus = "Paid";
    if (inv.status) finalStatus = inv.status;
    else if (inv.amountPending > 0) finalStatus = "Pending";

    newData.invoices.push({
      ...inv,
      id: crypto.randomUUID(),
      customerName,
      companyName,
      lineItems: processedLineItems,
      totalAmount: invoiceTotal,
      status: finalStatus,
      _missing: !inv.serialNumber || !inv.invoiceDate || !customerName,
    });

    if (newData.customers[inv.customer_id]) {
      newData.customers[inv.customer_id].totalPurchaseAmount += invoiceTotal;
    }
  });

  console.log("Merged data:", newData);
  return newData;
};
