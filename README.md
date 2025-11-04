# Swipe Invoice Manager

A **React + Firebase** web application that automates invoice data extraction from images, PDFs, and Excel files using **Google Gemini AI**. It organizes extracted data into a real-time, three-tab dashboard (Invoices, Products, Customers) with full editing, sorting, and pagination.

🔗 **Live Demo:** https://idyllic-sherbet-abf288.netlify.app/

---

## ✨ Features

### 🤖 AI-Powered Extraction
- Multi-modal file support: `.pdf`, `.png`, `.jpg`, `.xlsx`
- Uses **Google Gemini AI** for text + visual extraction

### 🗃️ Real-Time Dashboard Tabs
- **Invoices** – line-item-level data
- **Products** – unique products + stock aggregation
- **Customers** – CRM-style history

### ⚡ Real-Time Sync
- **Redux Toolkit + RTK Query**
- Editing product name updates Invoice table instantly

### ☁️ Firebase Firestore Back-End
- Real-time cloud database
- Instant sync across UI
---

## 🛠️ Tech Stack

### Frontend
- ⚛️ React (Vite)
- 🗂️ Redux Toolkit + RTK Query
- 🎨 Tailwind CSS

### Backend / Services
- ☁️ Firebase Firestore
- 🤖 Google Gemini AI

---

## 📂 Project Structure
```
root/
├── .env.local
├── package.json
├── tailwind.config.js
├── vite.config.js
└── src/
├── app/
│ └── store.js
├── components/
│ ├── EditableCell.jsx
│ ├── FileUploader.jsx
│ ├── Header.jsx
│ ├── Summary.jsx
│ └── TabNavigation.jsx
├── features/
│ ├── data/
│ │ ├── dataService.js
│ │ ├── dataSlice.js
│ │ └── firestoreApi.js
│ ├── customers/
│ │ └── CustomersTab.jsx
│ ├── invoices/
│ │ └── InvoicesTab.jsx
│ └── products/
│ └── ProductsTab.jsx
├── firebase/
│ └── firebaseConfig.js
├── hooks/
│ └── useSortableData.js
├── App.jsx
├── index.css
└── main.jsx
```
---

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository
```sh
git clone https://github.com/YourUsername/swipe-invoice-app.git
cd swipe-invoice-app
```
### 2️⃣ Install Dependencies
```
npm install
```
### 3️⃣ Create .env.local
```
VITE_GEMINI_API_KEY="AIza..."
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."...}
VITE_APP_ID="local-test-app"
```
### 4️⃣ Start Dev Server
```
npm run dev
```
App runs on:

http://localhost:5173
