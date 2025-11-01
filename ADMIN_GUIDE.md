# Admin Panel Guide - DigitalStore

## Admin Access Credentials

**Default Admin Login:**
- Email: `admin@digitalstore.com`
- Password: `admin123`

**Admin Login URL:** `/admin`

---

## Features Overview

### 1. **Admin Dashboard** (`/admin/dashboard`)
Once logged in, you'll have access to:

#### Statistics Overview
- **Total Users**: Number of registered users
- **Total Products**: Number of products in catalog
- **Total Orders**: Number of paid orders
- **Revenue**: Total revenue from paid orders

#### Product Management
- View all products in a list
- See product images, names, categories, and prices
- Quick actions for each product (Edit/Delete)

---

## Admin Capabilities

### 1. Add New Product
Click the **"Add New Product"** button on the dashboard to open the product creation modal.

**Fields:**
- **Product Name** (required)
- **Description** (required)
- **Price** in ₹ (required)
- **Category** (Software or Course)
- **Features** (comma-separated list)
- **Product Image** (upload image file)
- **Download File** (upload PDF, ZIP, or any file)

**File Upload:**
- Images and files are uploaded to Cloudinary
- Automatic secure URL generation
- Supports all common file formats

### 2. Edit Product
Click the **"Edit"** button on any product to modify its details.

**You can update:**
- Any product information
- Replace product image (optional)
- Replace download file (optional)
- If you don't upload new files, existing ones are kept

### 3. Delete Product
Click the **"Delete"** button on any product.
- Confirmation dialog appears before deletion
- Product is permanently removed from database

---

## Technical Details

### Backend API Endpoints

**Admin Authentication:**
- `POST /api/auth/login` - Login with admin credentials

**Admin-Only Endpoints (require admin role):**
- `GET /api/admin/stats` - Get dashboard statistics
- `POST /api/admin/products` - Create new product with file upload
- `PUT /api/admin/products/{id}` - Update product with file upload
- `DELETE /api/admin/products/{id}` - Delete product
- `POST /api/admin/upload` - Upload single file to Cloudinary

### Database Storage
- **MongoDB Atlas**: All data stored in cloud database
- **Collections**: users, products, carts, orders
- **Admin User**: Stored in users collection with `role: "admin"`

### File Storage
- **Cloudinary**: All images and download files
- **Auto-organization**: 
  - Product images: `ecommerce/products/` folder
  - Download files: `ecommerce/downloads/` folder

---

## User Experience

### Admin Navigation
When logged in as admin, you'll see:
- **Admin Panel** link in header navigation
- No cart icon (admins don't shop)
- Dashboard redirects to admin dashboard

### Security
- JWT token-based authentication
- Role-based access control
- Admin-only routes protected on backend
- Frontend checks admin role before showing admin UI

---

## How It Works

1. **Login**: Admin logs in via `/admin` page
2. **Verification**: Backend verifies admin role
3. **Dashboard**: Admin sees statistics and product list
4. **Add Product**: 
   - Fill form with product details
   - Upload image and download file
   - Files uploaded to Cloudinary
   - Product saved to MongoDB with file URLs
5. **Edit Product**:
   - Load existing product data
   - Modify any fields
   - Optionally upload new files
   - Update saved to MongoDB
6. **Delete Product**:
   - Confirm deletion
   - Product removed from MongoDB

---

## Tips for Admins

1. **Image Size**: Recommended max 2MB for fast loading
2. **Download Files**: Any file type supported (PDF, ZIP, etc.)
3. **Features**: Use commas to separate features
4. **Category**: Choose between Software or Course
5. **Price**: Enter in Indian Rupees (₹)

---

## Environment Configuration

The following environment variables are configured:

**Backend (.env):**
```
MONGO_URL=mongodb+srv://saikumar22102005:projectstartup@cluster0.spzm4pc.mongodb.net/...
DB_NAME=ecommerce_db
CLOUDINARY_URL=cloudinary://454177812827398:nUJL9QABXjQgmbMyKTId_laog74@dwvx9kg8e
```

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=https://product-checkout-4.preview.emergentagent.com
```

---

## Future Enhancements (Optional)

Possible features to add:
- User management (view/block users)
- Order management (view order details, refunds)
- Sales analytics with charts
- Bulk product upload
- Product categories management
- Discount/coupon management
- Email notifications
