import React from 'react';
import { useUpdateDataMutation } from '../data/firestoreApi';
import EditableCell from '../../components/EditableCell';
import { AlertTriangle } from 'lucide-react';

// Marker for required fields in the header
const RequiredMarker = () => <span className="text-red-500 font-bold ml-1">*</span>;

const ProductsTab = ({ data, userId }) => {
  const { invoices, products, customers } = data;
  const [updateData] = useUpdateDataMutation();

  // Convert products object to an array for mapping
  const productList = Object.values(products);
  
  // This function creates the *entire new state* and sends it to Firestore
  // This ensures all data (including synced fields) is saved.
  const handleUpdate = (productId, field, newValue) => {
    // Create a deep copy to avoid mutating the original state
    let newData = JSON.parse(JSON.stringify(data));
    let productUpdated = false;

    // Ensure the new value is a number if the field requires it
    const isNumericField = field === 'quantity' || field === 'unitPrice' || field === 'tax';
    const numericValue = parseFloat(newValue);
    const valueToSave = isNumericField ? (isNaN(numericValue) ? 0 : numericValue) : newValue;

    if (newData.products[productId]) {
      newData.products[productId][field] = valueToSave;
      
      // Check if a required field is now filled
      const prod = newData.products[productId];
      prod._missing = !prod.name || prod.unitPrice == null || prod.quantity == null;

      productUpdated = true;
      
      // SYNC: Update all invoice line items that use this product
      newData.invoices.forEach(invoice => {
        invoice.lineItems.forEach(item => {
          if (item.product_id === productId) {
            if (field === 'name') {
              item.productName = valueToSave;
            }
            if (field === 'unitPrice' || field === 'tax') {
              // Re-calculate totals
              const unitPrice = field === 'unitPrice' ? valueToSave : item.unitPrice;
              const taxRate = (field === 'tax' ? valueToSave : item.tax) / 100;
              const priceBeforeTax = unitPrice * item.qty;
              const taxAmount = priceBeforeTax * taxRate;
              
              item.unitPrice = unitPrice;
              item.tax = taxRate * 100;
              item.totalAmount = priceBeforeTax + taxAmount;
            }
            // Check if this item is missing data
            item._missing = prod._missing;
          }
        });
      });
    }
    
    if (productUpdated) {
      updateData({ userId, newData });
    }
  };

  return (
    <div className="p-4 bg-white rounded-b-lg shadow-xl">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Products ({productList.length})</h2>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Name<RequiredMarker /></th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Quantity<RequiredMarker /></th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Unit Price<RequiredMarker /></th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Tax (%)<RequiredMarker /></th>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Price with Tax<RequiredMarker /></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {productList.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">No product data yet.</td></tr>
            ) : (
              productList.map((product) => {
                 // Calculate derived field: Price with Tax
                 const taxRate = (product.tax || 0) / 100;
                 const priceWithTax = (product.unitPrice || 0) * (1 + taxRate);
                 const isMissing = product._missing || !product.name || product.unitPrice == null || product.quantity == null;

                 return (
                  <tr key={product.id} className={`${isMissing ? 'bg-yellow-50' : 'hover:bg-indigo-50'} transition-colors`}>
                    
                    {/* Editable Name */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      <EditableCell
                        value={product.name}
                        onSave={(v) => handleUpdate(product.id, 'name', v)}
                        label="Product Name"
                        isMissing={!product.name}
                      />
                    </td>
                    
                    {/* Editable Quantity */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      <EditableCell
                        value={product.quantity}
                        onSave={(v) => handleUpdate(product.id, 'quantity', v)}
                        label="Quantity"
                        isMissing={product.quantity == null}
                      />
                    </td>
                    
                    {/* Editable Unit Price */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                      <EditableCell
                        value={product.unitPrice}
                        onSave={(v) => handleUpdate(product.id, 'unitPrice', v)}
                        label="Unit Price"
                        isMissing={product.unitPrice == null}
                      />
                    </td>
                    
                    {/* Editable Tax */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">
                       <EditableCell
                        value={product.tax}
                        onSave={(v) => handleUpdate(product.id, 'tax', v)}
                        label="Tax %"
                        isMissing={product.tax == null}
                      />
                    </td>
                    
                    {/* Computed Column */}
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${priceWithTax.toFixed(2)}
                    </td>
                  </tr>
                 )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTab;
```
