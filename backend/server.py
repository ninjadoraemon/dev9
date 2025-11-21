from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from passlib.context import CryptContext
import razorpay
from fastapi import Request
import cloudinary
import cloudinary.uploader
import cloudinary.api

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Cloudinary configuration
cloudinary.config(
    cloud_name='dwvx9kg8e',
    api_key='454177812827398',
    api_secret='nUJL9QABXjQgmbMyKTId_laog74'
)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Razorpay client
razorpay_client = razorpay.Client(auth=(
    os.environ.get('RAZORPAY_KEY_ID', ''),
    os.environ.get('RAZORPAY_KEY_SECRET', '')
))

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ClerkUserSync(BaseModel):
    clerk_id: str
    email: EmailStr
    name: str
    profile_image_url: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "user"  # "user" or "admin"
    clerk_id: Optional[str] = None  # Clerk user ID for Clerk authenticated users
    profile_image_url: Optional[str] = None
    purchased_products: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str  # "software" or "course"
    image_url: str
    download_link: str
    video_url: Optional[str] = None
    video_chapters: Optional[List[dict]] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: str
    download_link: str
    video_url: Optional[str] = None
    video_chapters: Optional[List[dict]] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem] = Field(default_factory=list)
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[dict]
    total: float
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    status: str = "created"  # created, paid, failed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RazorpayOrderCreate(BaseModel):
    amount: float

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str
    clerk_id: Optional[str] = None

class OrderCreateRequest(BaseModel):
    clerk_id: Optional[str] = None
    cart_items: Optional[List[dict]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    download_link: Optional[str] = None
    video_url: Optional[str] = None
    video_chapters: Optional[List[dict]] = None
    features: Optional[List[str]] = None

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def get_current_user_flexible(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = None
):
    """
    Flexible authentication that supports both JWT and Clerk users.
    For JWT: Pass token in Authorization header
    For Clerk: Pass clerk_id in request body or query params
    """
    # Try to get Authorization header manually
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id:
                user = await db.users.find_one({"id": user_id}, {"_id": 0})
                if user:
                    return user
        except (ExpiredSignatureError, InvalidTokenError):
            pass
    
    # If JWT failed or not provided, this will be handled at endpoint level
    # where clerk_id can be extracted from request body
    return None

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with demo course
    demo_course_id = "12e942d3-1091-43f0-b22c-33508096276b"
    user = User(
        email=user_data.email,
        name=user_data.name,
        purchased_products=[demo_course_id]
    )
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"sub": user.id})
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user['id']})
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user.get('role', 'user')
        }
    }

@api_router.post("/auth/clerk-sync")
async def clerk_sync(clerk_user: ClerkUserSync):
    """
    Sync Clerk user to MongoDB. Creates new user or updates existing one.
    """
    # Check if user already exists by clerk_id
    existing_user = await db.users.find_one({"clerk_id": clerk_user.clerk_id}, {"_id": 0})
    
    if existing_user:
        # Update existing user
        update_data = {
            "name": clerk_user.name,
            "email": clerk_user.email,
        }
        if clerk_user.profile_image_url:
            update_data["profile_image_url"] = clerk_user.profile_image_url
            
        await db.users.update_one(
            {"clerk_id": clerk_user.clerk_id},
            {"$set": update_data}
        )
        return {
            "status": "updated",
            "user": {
                "id": existing_user['id'],
                "email": clerk_user.email,
                "name": clerk_user.name,
                "clerk_id": clerk_user.clerk_id
            }
        }
    else:
        # Create new user with demo course
        demo_course_id = "12e942d3-1091-43f0-b22c-33508096276b"
        user = User(
            email=clerk_user.email,
            name=clerk_user.name,
            clerk_id=clerk_user.clerk_id,
            profile_image_url=clerk_user.profile_image_url,
            purchased_products=[demo_course_id]
        )
        user_dict = user.model_dump()
        
        await db.users.insert_one(user_dict)
        
        return {
            "status": "created",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "clerk_id": user.clerk_id,
                "purchased_products": user.purchased_products
            }
        }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "role": current_user.get('role', 'user'),
        "purchased_products": current_user.get('purchased_products', [])
    }

# Product Routes
@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None):
    query = {}
    if category:
        query['category'] = category
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    product = Product(**product_data.model_dump())
    await db.products.insert_one(product.model_dump())
    return product

# Cart Routes
@api_router.get("/cart")
async def get_cart(current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user['id']}, {"_id": 0})
    if not cart:
        return {"items": []}
    
    # Get product details for cart items
    items_with_details = []
    for item in cart.get('items', []):
        product = await db.products.find_one({"id": item['product_id']}, {"_id": 0})
        if product:
            items_with_details.append({
                "product": product,
                "quantity": item['quantity']
            })
    
    return {"items": items_with_details}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, current_user: dict = Depends(get_current_user)):
    # Check if product exists
    product = await db.products.find_one({"id": item.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await db.carts.find_one({"user_id": current_user['id']})
    
    if not cart:
        # Create new cart
        new_cart = Cart(user_id=current_user['id'], items=[item.model_dump()])
        await db.carts.insert_one(new_cart.model_dump())
    else:
        # Update existing cart
        items = cart.get('items', [])
        existing_item = next((i for i in items if i['product_id'] == item.product_id), None)
        
        if existing_item:
            # Product already in cart - don't add again
            raise HTTPException(status_code=400, detail="Product already in cart")
        else:
            items.append(item.model_dump())
        
        await db.carts.update_one(
            {"user_id": current_user['id']},
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Item added to cart"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user['id']})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = [item for item in cart.get('items', []) if item['product_id'] != product_id]
    
    await db.carts.update_one(
        {"user_id": current_user['id']},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current_user['id']},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cart cleared"}

# Payment & Order Routes
@api_router.post("/orders/create")
async def create_order(request: Request):
    """
    Create order for both JWT and Clerk authenticated users.
    For Clerk users: Provide clerk_id and cart_items in request body
    For JWT users: Cart is fetched from database using Authorization header
    """
    user = None
    cart_items = []
    
    # Try to get JWT user first
    current_user = await get_current_user_flexible(request)
    
    # Try to get request body for Clerk users
    order_request = None
    try:
        body = await request.json()
        if body:
            order_request = OrderCreateRequest(**body)
    except:
        pass
    
    # Determine user and cart source
    if current_user:
        # JWT authenticated user
        user = current_user
        cart = await db.carts.find_one({"user_id": user['id']})
        if not cart or not cart.get('items'):
            raise HTTPException(status_code=400, detail="Cart is empty")
        cart_items = cart['items']
    elif order_request and order_request.clerk_id:
        # Clerk authenticated user
        user = await db.users.find_one({"clerk_id": order_request.clerk_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not order_request.cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")
        cart_items = order_request.cart_items
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Calculate total and get product details
    items = []
    total = 0
    for item in cart_items:
        product_id = item.get('product_id') or item.get('id')
        quantity = item.get('quantity', 1)
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if product:
            items.append({
                "product_id": product['id'],
                "name": product['name'],
                "price": product['price'],
                "quantity": quantity
            })
            total += product['price'] * quantity
    
    if not items:
        raise HTTPException(status_code=400, detail="No valid items in cart")
    
    # Create Razorpay order
    razorpay_order = razorpay_client.order.create({
        "amount": int(total * 100),  # Convert to paise
        "currency": "INR",
        "payment_capture": 1
    })
    
    # Create order in database
    order = Order(
        user_id=user['id'],
        items=items,
        total=total,
        razorpay_order_id=razorpay_order['id']
    )
    
    await db.orders.insert_one(order.model_dump())
    
    return {
        "order_id": order.id,
        "razorpay_order_id": razorpay_order['id'],
        "amount": total,
        "currency": "INR",
        "key_id": os.environ.get('RAZORPAY_KEY_ID', '')
    }

@api_router.post("/orders/verify")
async def verify_payment(
    request: Request,
    verification: PaymentVerification
):
    """
    Verify payment for both JWT and Clerk authenticated users.
    For Clerk users: Provide clerk_id in request body
    """
    # Try to get JWT user first
    current_user = await get_current_user_flexible(request)
    try:
        # Verify signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': verification.razorpay_order_id,
            'razorpay_payment_id': verification.razorpay_payment_id,
            'razorpay_signature': verification.razorpay_signature
        })
        
        # Get order
        order = await db.orders.find_one({"id": verification.order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Determine user
        user = None
        if current_user:
            user = current_user
        elif verification.clerk_id:
            user = await db.users.find_one({"clerk_id": verification.clerk_id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        else:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Update order
        await db.orders.update_one(
            {"id": verification.order_id},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": verification.razorpay_payment_id
            }}
        )
        
        # Add products to user's purchased list
        product_ids = [item['product_id'] for item in order['items']]
        await db.users.update_one(
            {"id": user['id']},
            {"$addToSet": {"purchased_products": {"$each": product_ids}}}
        )
        
        # Clear cart (only for JWT users with backend cart)
        if current_user:
            await db.carts.update_one(
                {"user_id": user['id']},
                {"$set": {"items": []}}
            )
        
        return {"message": "Payment verified successfully", "status": "paid"}
    except Exception as e:
        await db.orders.update_one(
            {"id": verification.order_id},
            {"$set": {"status": "failed"}}
        )
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")

@api_router.post("/orders/claim-free")
async def claim_free_products(request: Request):
    """
    Claim free products (price = 0) without payment.
    For Clerk users: Provide clerk_id and cart_items in request body
    For JWT users: Cart is fetched from database using Authorization header
    """
    user = None
    cart_items = []
    
    # Try to get JWT user first
    current_user = await get_current_user_flexible(request)
    
    # Try to get request body for Clerk users
    order_request = None
    try:
        body = await request.json()
        if body:
            order_request = OrderCreateRequest(**body)
    except:
        pass
    
    # Determine user and cart source
    if current_user:
        # JWT authenticated user
        user = current_user
        cart = await db.carts.find_one({"user_id": user['id']})
        if not cart or not cart.get('items'):
            raise HTTPException(status_code=400, detail="Cart is empty")
        cart_items = cart['items']
    elif order_request and order_request.clerk_id:
        # Clerk authenticated user
        user = await db.users.find_one({"clerk_id": order_request.clerk_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not order_request.cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")
        cart_items = order_request.cart_items
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify all products are free and collect product IDs
    product_ids = []
    for item in cart_items:
        product_id = item.get('product_id') or item.get('id')
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            continue
        if product['price'] != 0:
            raise HTTPException(status_code=400, detail="Only free products can be claimed without payment")
        product_ids.append(product['id'])
    
    if not product_ids:
        raise HTTPException(status_code=400, detail="No valid free products in cart")
    
    # Add products to user's purchased list
    await db.users.update_one(
        {"id": user['id']},
        {"$addToSet": {"purchased_products": {"$each": product_ids}}}
    )
    
    # Clear cart (only for JWT users with backend cart)
    if current_user:
        await db.carts.update_one(
            {"user_id": user['id']},
            {"$set": {"items": []}}
        )
    
    return {
        "message": "Free products claimed successfully",
        "products_claimed": len(product_ids),
        "product_ids": product_ids
    }

@api_router.get("/orders")
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user['id']}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user['id']}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# Purchased Products
@api_router.get("/purchased-products")
async def get_purchased_products(current_user: dict = Depends(get_current_user)):
    purchased_ids = current_user.get('purchased_products', [])
    if not purchased_ids:
        return []
    
    products = await db.products.find({"id": {"$in": purchased_ids}}, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/clerk/purchased-products/{clerk_id}")
async def get_clerk_purchased_products(clerk_id: str):
    """
    Get purchased products for a Clerk user by their clerk_id
    """
    user = await db.users.find_one({"clerk_id": clerk_id}, {"_id": 0})
    if not user:
        return []
    
    purchased_ids = user.get('purchased_products', [])
    if not purchased_ids:
        return []
    
    products = await db.products.find({"id": {"$in": purchased_ids}}, {"_id": 0}).to_list(1000)
    return products

# Admin Routes
@api_router.get("/download/{product_id}")
async def download_product(product_id: str):
    """
    Proxy endpoint to serve product download files.
    Fetches from Cloudinary and serves directly to bypass access restrictions.
    """
    import httpx
    from fastapi.responses import StreamingResponse, Response
    
    try:
        # Get product
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        download_url = product.get('download_link', '')
        if not download_url:
            raise HTTPException(status_code=404, detail="Download link not available")
        
        # Revert to original URL if it was changed to /raw/
        if '/raw/upload/' in download_url:
            download_url = download_url.replace('/raw/upload/', '/image/upload/')
        
        # Try to use Cloudinary SDK to get signed URL
        try:
            # Extract public_id from URL
            parts = download_url.split('/upload/')
            if len(parts) == 2:
                public_id_with_version = parts[1]
                public_id_parts = public_id_with_version.split('/', 1)
                if len(public_id_parts) == 2:
                    full_public_id = public_id_parts[1]
                    
                    # Generate authenticated/signed URL
                    signed_url = cloudinary.utils.cloudinary_url(
                        full_public_id,
                        resource_type='image',
                        type='upload',
                        sign_url=True,
                        secure=True
                    )[0]
                    
                    # Fetch using signed URL
                    async with httpx.AsyncClient() as client:
                        response = await client.get(signed_url, follow_redirects=True)
                        
                        if response.status_code == 200:
                            # Determine filename
                            filename = product.get('name', 'download').replace(' ', '_') + '.pdf'
                            
                            # Return the PDF content
                            return Response(
                                content=response.content,
                                media_type='application/pdf',
                                headers={
                                    'Content-Disposition': f'attachment; filename="{filename}"',
                                    'Content-Length': str(len(response.content))
                                }
                            )
        except Exception as e:
            print(f"Signed URL attempt failed: {e}")
        
        # If signed URL fails, return error
        raise HTTPException(
            status_code=500,
            detail="Unable to access file. Please contact admin to re-upload the product file."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

# Admin Routes
@api_router.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...),
    admin_user: dict = Depends(get_admin_user)
):
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file.file,
            folder="ecommerce",
            resource_type="auto"
        )
        return {
            "url": result['secure_url'],
            "public_id": result['public_id']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.post("/admin/products")
async def admin_create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    category: str = Form(...),
    features: str = Form(""),
    video_url: str = Form(""),
    video_chapters: str = Form(""),
    image: UploadFile = File(None),
    download_file: UploadFile = File(None),
    admin_user: dict = Depends(get_admin_user)
):
    try:
        image_url = ""
        download_link = ""
        
        # Upload image if provided
        if image:
            img_result = cloudinary.uploader.upload(
                image.file,
                folder="ecommerce/products",
                resource_type="image"
            )
            image_url = img_result['secure_url']
        
        # Upload download file if provided
        if download_file:
            file_result = cloudinary.uploader.upload(
                download_file.file,
                folder="ecommerce/downloads",
                resource_type="raw",  # Use 'raw' for PDFs and other documents
                access_mode="public"  # Make file publicly accessible
            )
            download_link = file_result['secure_url']
        
        # Parse features
        features_list = [f.strip() for f in features.split(',') if f.strip()] if features else []
        
        # Parse video chapters (JSON string)
        import json
        video_chapters_list = []
        if video_chapters:
            try:
                video_chapters_list = json.loads(video_chapters)
            except:
                pass
        
        # Create product
        product = Product(
            name=name,
            description=description,
            price=price,
            category=category,
            image_url=image_url,
            download_link=download_link,
            video_url=video_url if video_url else None,
            video_chapters=video_chapters_list,
            features=features_list
        )
        
        await db.products.insert_one(product.model_dump())
        return product
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(
    product_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    features: Optional[str] = Form(None),
    video_url: Optional[str] = Form(None),
    video_chapters: Optional[str] = Form(None),
    image: UploadFile = File(None),
    download_file: UploadFile = File(None),
    admin_user: dict = Depends(get_admin_user)
):
    try:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        update_data = {}
        
        if name:
            update_data['name'] = name
        if description:
            update_data['description'] = description
        if price is not None:
            update_data['price'] = price
        if category:
            update_data['category'] = category
        if features:
            update_data['features'] = [f.strip() for f in features.split(',') if f.strip()]
        if video_url is not None:
            update_data['video_url'] = video_url if video_url else None
        if video_chapters:
            import json
            try:
                update_data['video_chapters'] = json.loads(video_chapters)
            except:
                pass
        
        # Upload new image if provided
        if image:
            img_result = cloudinary.uploader.upload(
                image.file,
                folder="ecommerce/products",
                resource_type="image"
            )
            update_data['image_url'] = img_result['secure_url']
        
        # Upload new download file if provided
        if download_file:
            file_result = cloudinary.uploader.upload(
                download_file.file,
                folder="ecommerce/downloads",
                resource_type="raw",  # Use 'raw' for PDFs and other documents
                access_mode="public"  # Make file publicly accessible
            )
            update_data['download_link'] = file_result['secure_url']
        
        if update_data:
            await db.products.update_one(
                {"id": product_id},
                {"$set": update_data}
            )
        
        updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
        return updated_product
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(
    product_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted successfully"}

@api_router.get("/admin/stats")
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({"role": "user"})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"status": "paid"})
    
    # Calculate total revenue
    orders = await db.orders.find({"status": "paid"}, {"_id": 0}).to_list(1000)
    total_revenue = sum(order.get('total', 0) for order in orders)
    
    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "paid_orders": paid_orders,
        "total_revenue": total_revenue
    }

@api_router.post("/admin/distribute-demo-course")
async def distribute_demo_course(admin_user: dict = Depends(get_admin_user)):
    """Add demo course to all existing users"""
    demo_course_id = "12e942d3-1091-43f0-b22c-33508096276b"
    
    # Check if demo course exists
    demo_course = await db.products.find_one({"id": demo_course_id})
    if not demo_course:
        raise HTTPException(status_code=404, detail="Demo course not found")
    
    # Add to all users who don't already have it
    result = await db.users.update_many(
        {"purchased_products": {"$ne": demo_course_id}},
        {"$addToSet": {"purchased_products": demo_course_id}}
    )
    
    return {
        "message": "Demo course distributed",
        "users_updated": result.modified_count
    }

@api_router.post("/admin/make-downloads-public")
async def make_downloads_public(admin_user: dict = Depends(get_admin_user)):
    """
    Make existing download files public in Cloudinary by updating their access_mode.
    This should fix the 401 Unauthorized errors for existing files.
    """
    try:
        products = await db.products.find({}, {"_id": 0}).to_list(1000)
        updated_count = 0
        errors = []
        
        for product in products:
            download_link = product.get('download_link', '')
            if not download_link or 'cloudinary.com' not in download_link:
                continue
            
            try:
                # Extract public_id from Cloudinary URL
                # URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}
                parts = download_link.split('/upload/')
                if len(parts) == 2:
                    public_id_with_version = parts[1]
                    # Remove version number and get public_id
                    public_id_parts = public_id_with_version.split('/', 1)
                    if len(public_id_parts) == 2:
                        public_id = public_id_parts[1].rsplit('.', 1)[0]  # Remove extension
                        
                        # Determine resource type from URL
                        resource_type = 'image' if '/image/upload/' in download_link else 'raw'
                        
                        # Update access mode to public
                        cloudinary.api.update(
                            public_id,
                            access_mode='public',
                            resource_type=resource_type
                        )
                        updated_count += 1
            except Exception as e:
                errors.append(f"{product.get('name', 'Unknown')}: {str(e)}")
        
        return {
            "message": f"Updated {updated_count} files to public access",
            "errors": errors if errors else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update files: {str(e)}")

@api_router.post("/admin/seed")
async def seed_admin():
    """One-time endpoint to create admin user"""
    existing_admin = await db.users.find_one({"email": "admin@digitalstore.com"})
    if existing_admin:
        return {"message": "Admin already exists"}
    
    admin_user = User(
        email="admin@digitalstore.com",
        name="Admin",
        role="admin"
    )
    admin_dict = admin_user.model_dump()
    admin_dict['password_hash'] = hash_password("admin123")
    
    await db.users.insert_one(admin_dict)
    return {"message": "Admin user created", "email": "admin@digitalstore.com", "password": "admin123"}

@api_router.post("/admin/fix-download-links")
async def fix_download_links(admin_user: dict = Depends(get_admin_user)):
    """
    Revert download links back to /image/upload/ path since files exist there.
    The proxy endpoint /api/download/{product_id} will handle serving them.
    """
    try:
        products = await db.products.find({}, {"_id": 0}).to_list(1000)
        fixed_count = 0
        
        for product in products:
            download_link = product.get('download_link', '')
            if download_link and '/raw/upload/' in download_link:
                # Revert back to /image/upload/ where files actually exist
                new_link = download_link.replace('/raw/upload/', '/image/upload/')
                await db.products.update_one(
                    {"id": product['id']},
                    {"$set": {"download_link": new_link}}
                )
                fixed_count += 1
        
        return {
            "message": f"Reverted {fixed_count} download links to original URLs",
            "note": "Files will be served through proxy endpoint /api/download/{product_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fix links: {str(e)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",                 # Local development
        "https://dev7.vercel.app",      # Replace with your actual Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Simple logging (Vercel captures stdout automatically)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("server")

logger.info("🚀 FastAPI server initialized successfully")

# ✅ Graceful shutdown for MongoDB or other clients
@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        client.close()
        logger.info("✅ MongoDB connection closed successfully.")
    except Exception as e:
        logger.error(f"❌ Error closing MongoDB client: {e}")
