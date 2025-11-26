import React, { useState, useEffect } from 'react';
import AnoAI from './components/ui/animated-shader-background';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, UserButton, useUser, SignedIn, SignedOut } from '@clerk/clerk-react';
import axios from 'axios';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, User, LogOut, Download, Check, Play, BookOpen, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/sonner';
import { toast as sonnerToast } from 'sonner';
import AdvancedVideoPlayer from '@/components/AdvancedVideoPlayer';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_PUBLISHABLE_KEY || 'pk_test_aGVyb2ljLW1hc3RpZmYtODcuY2xlcmsuYWNjb3VudHMuZGV2JA';

const App = () => {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      navigate={(to) => window.location.href = to}
    >
      <AppContent />
    </ClerkProvider>
  );
};

const AppContent = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const { user: clerkUser, isLoaded } = useUser();
  const [clerkSynced, setClerkSynced] = useState(false);
  const [cart, setCart] = useState([]);

  // Wrap logout in useCallback to be stable for useEffect dependencies
  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    // Also clear Clerk cart if exists
    if (clerkUser) {
      localStorage.removeItem(`clerk_cart_${clerkUser.id}`);
    }
    setCart([]);
  }, [clerkUser]);

  // Global Axios Interceptor for 401 Unauthorized
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only logout if we actually have a token that might be invalid
          if (token) {
            logout();
            sonnerToast.error('Session expired. Please sign in again.');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  // Sync Clerk user to MongoDB when they sign in
  useEffect(() => {
    const syncClerkUser = async () => {
      if (isLoaded && clerkUser && !clerkSynced) {
        try {
          const response = await axios.post(`${API}/auth/clerk-sync`, {
            clerk_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            name: clerkUser.fullName || clerkUser.firstName || 'User',
            profile_image_url: clerkUser.imageUrl
          });
          console.log('Clerk user synced to MongoDB:', response.data);
          setClerkSynced(true);
        } catch (error) {
          console.error('Error syncing Clerk user:', error);
        }
      }
    };

    syncClerkUser();
  }, [isLoaded, clerkUser, clerkSynced]);

  // Fetch cart when user/token changes
  useEffect(() => {
    if (clerkUser || (user && token)) {
      fetchCart();
    }
  }, [clerkUser, user, token]);

  const fetchCart = async () => {
    try {
      // For Clerk users, use email-based cart (we'll store in localStorage temporarily)
      if (clerkUser) {
        const clerkCart = JSON.parse(localStorage.getItem(`clerk_cart_${clerkUser.id}`) || '[]');
        setCart(clerkCart);
      } else if (token) {
        const response = await axios.get(`${API}/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCart(response.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      // 401 handled by interceptor now
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Clerk Auth Pages - No Header */}
        <Route path="/signin" element={<ClerkSignInPage />} />
        <Route path="/signup" element={<ClerkSignUpPage />} />

        {/* Main App with Header */}
        <Route path="*" element={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header user={user} clerkUser={clerkUser} logout={logout} cart={cart} />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage clerkUser={clerkUser} user={user} token={token} toast={toast} cart={cart} setCart={setCart} fetchCart={fetchCart} />} />
              <Route path="/product/:id" element={<ProductDetailPage clerkUser={clerkUser} user={user} token={token} toast={toast} cart={cart} setCart={setCart} fetchCart={fetchCart} />} />
              <Route path="/cart" element={<CartPage clerkUser={clerkUser} user={user} token={token} toast={toast} cart={cart} setCart={setCart} fetchCart={fetchCart} />} />
              <Route path="/dashboard" element={<DashboardPage clerkUser={clerkUser} user={user} token={token} />} />
              <Route path="/admin" element={<AdminLogin setToken={setToken} toast={toast} />} />
              <Route path="/admin/dashboard" element={<AdminDashboard user={user} token={token} toast={toast} />} />
            </Routes>
            <Toaster />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
};

const Header = ({ user, clerkUser, logout, cart }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const cartItemCount = cart?.length || 0;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`${isHomePage ? 'header-low-opacity' : 'bg-white'} shadow-sm sticky top-0 z-50`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-slate-900" data-testid="logo-link">
          Nexura
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/products" className="text-slate-600 hover:text-slate-900" data-testid="products-nav-link">
            Products
          </Link>

          {/* Admin Panel Link (JWT Admin Only) */}
          {user?.role === 'admin' && (
            <Link to="/admin/dashboard" className="text-slate-600 hover:text-slate-900">
              Admin Panel
            </Link>
          )}

          {/* Clerk Authentication for Regular Users */}
          <SignedIn>
            <Link to="/cart" data-testid="cart-nav-link" className="relative">
              <Button variant="ghost" size="sm">
                <ShoppingCart className="w-4 h-4" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/dashboard" data-testid="dashboard-nav-link">
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4" />
              </Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Show login buttons only if not admin JWT user */}
          {!user && (
            <SignedOut>
              <Button onClick={() => navigate('/signin')} data-testid="clerk-login-button">
                Sign In
              </Button>
            </SignedOut>
          )}

          {/* JWT Authentication for Admin Only */}
          {user?.role === 'admin' && (
            <>
              <Link to="/admin/dashboard" data-testid="dashboard-nav-link">
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </nav>
      </div>
    </motion.header>
  );
};

const ClerkSignInPage = React.memo(() => {
  React.useEffect(() => {
    // Prevent any scrolling or layout shifts
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4"
      style={{ minHeight: '100vh', position: 'fixed', width: '100%', top: 0, left: 0 }}
    >
      <div className="w-full max-w-md" style={{ maxWidth: '28rem' }}>
        <SignIn
          routing="hash"
          signUpUrl="/signup"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-xl w-full",
              formButtonPrimary: "bg-slate-900 hover:bg-slate-800",
              formFieldInput: "rounded-md",
              footerActionLink: "text-slate-900 hover:text-slate-700"
            }
          }}
          afterSignInUrl="/products"
        />
      </div>
    </div>
  );
});

const ClerkSignUpPage = React.memo(() => {
  React.useEffect(() => {
    // Prevent any scrolling or layout shifts
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4"
      style={{ minHeight: '100vh', position: 'fixed', width: '100%', top: 0, left: 0 }}
    >
      <div className="w-full max-w-md" style={{ maxWidth: '28rem' }}>
        <SignUp
          routing="hash"
          signInUrl="/signin"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-xl w-full",
              formButtonPrimary: "bg-slate-900 hover:bg-slate-800",
              formFieldInput: "rounded-md",
              footerActionLink: "text-slate-900 hover:text-slate-700"
            }
          }}
          afterSignUpUrl="/products"
        />
      </div>
    </div>
  );
});

const HomePage = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);

  return (
    <div>
      {/* 🔮 Fixed Shader background - extends behind header */}
      <div className="fixed inset-0 z-0 bg-black">
        <AnoAI />
      </div>

      {/* 🌟 Foreground content */}
      <div className="relative w-full h-screen">
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 container mx-auto px-4 py-20 text-center flex flex-col items-center justify-center h-full"
          data-testid="hero-section"
        >
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-6xl font-bold text-white mb-6"
          >
            Premium Digital Products
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto"
          >
            Discover top-quality software, apps, and courses to elevate your skills and productivity
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link to="/products">
              <Button
                size="lg"
                className="text-lg px-8 bg-white text-black hover:bg-gray-200"
                data-testid="explore-products-button"
              >
                Explore Products
              </Button>
            </Link>
          </motion.div>
        </motion.section>
      </div>

      {/* Features Section */}
      <section className="bg-white py-20 relative z-10" data-testid="features-section">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-12"
          >
            Why Choose Us
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Premium Quality', desc: 'Handpicked digital products from top creators' },
              { title: 'Instant Access', desc: 'Download immediately after purchase' },
              { title: 'Secure Payments', desc: 'Safe and encrypted payment processing' }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const AuthPage = ({ setToken, toast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API}${endpoint}`, formData);
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      toast({ title: isLogin ? 'Login successful!' : 'Account created!' });
      navigate('/products');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Something went wrong',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-20" data-testid="auth-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? 'Login' : 'Create Account'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Welcome back!' : 'Start your journey today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <Input
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="name-input"
                />
              )}
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="email-input"
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="password-input"
              />
              <Button type="submit" className="w-full" data-testid="auth-submit-button">
                {isLogin ? 'Login' : 'Sign Up'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full"
              data-testid="toggle-auth-button"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

const ProductsPage = ({ clerkUser, user, token, toast, cart, setCart, fetchCart }) => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('all');
  const navigate = useNavigate();

  // Get authentication - prioritize Clerk for regular users
  const isAuthenticated = clerkUser || (user && token);
  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress || user?.email;

  useEffect(() => {
    fetchProducts();
  }, [category, clerkUser, token]);

  const fetchProducts = async () => {
    try {
      const url = category === 'all' ? `${API}/products` : `${API}/products?category=${category}`;
      const response = await axios.get(url);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const isInCart = (productId) => {
    return Array.isArray(cart) && cart.some(item => item.product?.id === productId);
  };

  const addToCart = async (productId) => {
    if (!isAuthenticated) {
      sonnerToast.error('Please sign in first');
      navigate('/signin');
      return;
    }

    if (isInCart(productId)) {
      sonnerToast.info('Product already in cart');
      return;
    }

    try {
      if (clerkUser) {
        // For Clerk users, use localStorage cart
        const product = products.find(p => p.id === productId);
        const newCart = [...cart, { product: product, quantity: 1 }];
        localStorage.setItem(`clerk_cart_${clerkUser.id}`, JSON.stringify(newCart));
        setCart(newCart);
        sonnerToast.success('Added to cart! 🎉', {
          description: 'Product has been added to your cart',
          duration: 2000,
        });
      } else if (token) {
        await axios.post(
          `${API}/cart/add`,
          { product_id: productId, quantity: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sonnerToast.success('Added to cart! 🎉', {
          description: 'Product has been added to your cart',
          duration: 2000,
        });
        fetchCart();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        sonnerToast.info('Product already in cart');
      } else {
        sonnerToast.error('Error adding to cart');
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-12" data-testid="products-page">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-8"
      >
        Browse Products
      </motion.h1>

      <Tabs value={category} onValueChange={setCategory} className="mb-8">
        <TabsList>
          <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
          <TabsTrigger value="software" data-testid="filter-software">Software</TabsTrigger>
          <TabsTrigger value="course" data-testid="filter-course">Courses</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid md:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03 }}
            data-testid={`product-card-${product.id}`}
          >
            <Card className="h-full flex flex-col">
              <div className="relative">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                {product.category === 'course' && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <Play className="w-3 h-3" /> Course
                  </div>
                )}
                {product.category === 'software' && (
                  <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <Code className="w-3 h-3" /> Software
                  </div>
                )}
                {product.price === 0 && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    FREE
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                <CardDescription className="line-clamp-2">{product.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <Badge>{product.category}</Badge>
                <p className="text-2xl font-bold mt-4">
                  {product.price === 0 ? 'FREE' : `₹${product.price}`}
                </p>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:flex-1"
                  onClick={() => navigate(`/product/${product.id}`)}
                  data-testid={`view-product-${product.id}`}
                >
                  View Details
                </Button>
                <Button
                  className="w-full sm:flex-1"
                  onClick={() => addToCart(product.id)}
                  data-testid={`add-to-cart-${product.id}`}
                  disabled={isInCart(product.id)}
                >
                  {isInCart(product.id) ? 'In Cart' : 'Add to Cart'}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ProductDetailPage = ({ clerkUser, user, token, toast, cart, setCart, fetchCart }) => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const navigate = useNavigate();

  const isAuthenticated = clerkUser || (user && token);

  useEffect(() => {
    fetchProduct();
  }, [id, clerkUser, token]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const checkIsInCart = () => {
    if (!cart) return false;
    return cart.some(item => item.product?.id === id);
  };

  const isInCart = checkIsInCart();

  const addToCart = async () => {
    if (!isAuthenticated) {
      sonnerToast.error('Please sign in first');
      navigate('/signin');
      return;
    }

    if (isInCart) {
      sonnerToast.info('Product already in cart');
      navigate('/cart');
      return;
    }

    try {
      if (clerkUser) {
        const clerkCart = [...cart, { product: product, quantity: 1 }];
        localStorage.setItem(`clerk_cart_${clerkUser.id}`, JSON.stringify(clerkCart));
        setCart(clerkCart);
        sonnerToast.success('Added to cart! 🎉', {
          description: 'Product has been added to your cart',
          duration: 2000,
        });
        setTimeout(() => navigate('/cart'), 1500);
      } else if (token) {
        await axios.post(
          `${API}/cart/add`,
          { product_id: id, quantity: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sonnerToast.success('Added to cart! 🎉', {
          description: 'Product has been added to your cart',
          duration: 2000,
        });
        fetchCart();
        setTimeout(() => navigate('/cart'), 1500);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        sonnerToast.info('Product already in cart');
      } else {
        sonnerToast.error('Error adding to cart');
      }
    }
  };

  if (!product) return <div className="container mx-auto px-4 py-12">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-12" data-testid="product-detail-page">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Video Section for Courses */}
        {product.video_url && product.category === 'course' && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Course Preview</h2>
            <AdvancedVideoPlayer
              videoUrl={product.video_url}
              chapters={product.video_chapters || []}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            {!product.video_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full rounded-lg shadow-lg"
              />
            )}
            {product.video_url && product.category === 'software' && (
              <div>
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full rounded-lg shadow-lg mb-6"
                />
                <div className="bg-slate-100 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5" /> Demo Video
                  </h3>
                  <AdvancedVideoPlayer
                    videoUrl={product.video_url}
                    chapters={product.video_chapters || []}
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <Badge className="mb-4">{product.category}</Badge>
            {product.price === 0 && (
              <Badge className="mb-4 ml-2 bg-green-500">FREE DEMO</Badge>
            )}
            <h1 className="text-4xl font-bold mb-4" data-testid="product-name">{product.name}</h1>
            <p className="text-slate-600 mb-6" data-testid="product-description">{product.description}</p>
            <p className="text-4xl font-bold mb-6" data-testid="product-price">
              {product.price === 0 ? 'FREE' : `₹${product.price}`}
            </p>

            {product.features && product.features.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Features:</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              size="lg"
              onClick={addToCart}
              className="w-full"
              data-testid="add-to-cart-detail-button"
              disabled={isInCart}
            >
              {isInCart ? 'Already in Cart' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CartPage = ({ clerkUser, user, token, toast, cart, setCart, fetchCart }) => {
  const navigate = useNavigate();

  const isAuthenticated = clerkUser || (user && token);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
    }
  }, [clerkUser, token]);

  const removeItem = async (productId) => {
    try {
      if (clerkUser) {
        const newCart = cart.filter(item => item.product?.id !== productId);
        localStorage.setItem(`clerk_cart_${clerkUser.id}`, JSON.stringify(newCart));
        setCart(newCart);
        sonnerToast.success('Item removed from cart');
      } else if (token) {
        await axios.delete(`${API}/cart/remove/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Item removed from cart');
        fetchCart();
      }
    } catch (error) {
      sonnerToast.error('Error removing item');
    }
  };

  const checkout = async () => {
    try {
      let orderData = {};
      let headers = {};

      if (clerkUser) {
        // Prepare cart items for Clerk order
        const validItems = Array.isArray(cart) ? cart.filter(item => item && item.product) : [];
        const cartItems = validItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }));

        orderData = {
          clerk_id: clerkUser.id,
          cart_items: cartItems
        };
        // No Authorization header needed for Clerk flow as per backend test
      } else if (token) {
        // JWT flow uses token in headers
        headers = { Authorization: `Bearer ${token}` };
      } else {
        sonnerToast.error('Please sign in to checkout');
        navigate('/signin');
        return;
      }

      const response = await axios.post(
        `${API}/orders/create`,
        orderData,
        { headers }
      );

      const options = {
        key: response.data.key_id,
        amount: response.data.amount * 100,
        currency: response.data.currency,
        order_id: response.data.razorpay_order_id,
        name: 'DigitalStore',
        description: 'Digital Products Purchase',
        handler: async (razorpayResponse) => {
          try {
            await axios.post(
              `${API}/orders/verify`,
              {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                order_id: response.data.order_id
              },
              { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );

            // Clear cart after successful payment
            if (clerkUser) {
              localStorage.removeItem(`clerk_cart_${clerkUser.id}`);
              setCart([]);
            } else {
              // For token users, fetch empty cart
              fetchCart();
            }

            sonnerToast.success('Payment successful!');
            navigate('/dashboard');
          } catch (error) {
            console.error('Payment verification error:', error);
            sonnerToast.error('Payment verification failed');
          }
        },
        prefill: {
          name: clerkUser?.fullName || user?.name,
          email: clerkUser?.primaryEmailAddress?.emailAddress || user?.email
        },
        theme: {
          color: '#0f172a'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Checkout error:', error);
      sonnerToast.error(error.response?.data?.detail || 'Checkout failed');
    }
  };

  const validItems = Array.isArray(cart) ? cart.filter(item => item && item.product) : [];
  const total = validItems.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);

  return (
    <div className="container mx-auto px-4 py-12" data-testid="cart-page">
      <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

      {validItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 mb-4">Your cart is empty</p>
            <Button onClick={() => navigate('/products')} data-testid="continue-shopping-button">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {validItems.map((item) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                data-testid={`cart-item-${item.product.id}`}
              >
                <Card>
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded"
                    />
                    <div className="flex-grow w-full sm:w-auto">
                      <h3 className="font-semibold">{item.product.name}</h3>
                      <p className="text-slate-600">
                        {item.product.price === 0 ? 'FREE' : `₹${item.product.price}`} × {item.quantity}
                      </p>
                      <p className="text-slate-900 font-semibold mt-1">
                        Subtotal: {item.product.price === 0 ? 'FREE' : `₹${(item.product.price * item.quantity).toFixed(2)}`}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(item.product.id)}
                      data-testid={`remove-item-${item.product.id}`}
                      className="w-full sm:w-auto"
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span data-testid="cart-subtotal">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span data-testid="cart-total">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={checkout} data-testid="checkout-button">
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardPage = ({ clerkUser, user, token }) => {
  const [purchasedProducts, setPurchasedProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  const isAuthenticated = clerkUser || (user && token);
  const displayName = clerkUser?.fullName || user?.name || 'User';
  const displayEmail = clerkUser?.primaryEmailAddress?.emailAddress || user?.email;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (clerkUser) {
      // For Clerk users, show demo course
      fetchDemoCourse();
    } else if (token) {
      fetchPurchasedProducts();
      fetchOrders();
    }
  }, [clerkUser, token]);

  const fetchDemoCourse = async () => {
    try {
      // For Clerk users, fetch purchased products from MongoDB using clerk_id
      const response = await axios.get(`${API}/clerk/purchased-products/${clerkUser.id}`);
      setPurchasedProducts(response.data);
    } catch (error) {
      console.error('Error fetching purchased products:', error);
      // Fallback to demo course if error
      try {
        const demoResponse = await axios.get(`${API}/products/12e942d3-1091-43f0-b22c-33508096276b`);
        setPurchasedProducts([demoResponse.data]);
      } catch (err) {
        console.error('Error fetching demo course:', err);
      }
    }
  };

  const fetchPurchasedProducts = async () => {
    try {
      const response = await axios.get(`${API}/purchased-products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPurchasedProducts(response.data);
    } catch (error) {
      console.error('Error fetching purchased products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12" data-testid="dashboard-page">
      <h1 className="text-4xl font-bold mb-8">My Dashboard</h1>

      <Tabs defaultValue="products">
        <TabsList className="mb-6">
          <TabsTrigger value="products" data-testid="tab-products">My Products</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Order History</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          {purchasedProducts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600">No purchased products yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {purchasedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-testid={`purchased-product-${product.id}`}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{product.name}</CardTitle>
                      <CardDescription>{product.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => window.open(product.download_link, '_blank')}
                        data-testid={`download-${product.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      {product.video_url && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600">No orders yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} data-testid={`order-${order.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Order #{order.id.substring(0, 8)}</CardTitle>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">Total: ₹{order.total}</p>
                    <div className="mt-2 text-sm text-slate-600">
                      {order.items.map((item, idx) => (
                        <p key={idx}>{item.name} - ₹{item.price}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Admin Login Component
const AdminLogin = ({ setToken, toast }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      const userData = response.data.user;

      if (userData.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'Admin access required',
          variant: 'destructive'
        });
        return;
      }

      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      toast({ title: 'Admin login successful!' });
      navigate('/admin/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Login failed',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Admin Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <Button type="submit" className="w-full">
                Login as Admin
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ user, token, toast }) => {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/admin');
      return;
    }
    fetchProducts();
    fetchStats();
  }, [token, user]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`${API}/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      sonnerToast.success('Product deleted successfully');
      fetchProducts();
      fetchStats();
    } catch (error) {
      sonnerToast.error('Error deleting product');
    }
  };

  const distributeDemo = async () => {
    try {
      const response = await axios.post(
        `${API}/admin/distribute-demo-course`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      sonnerToast.success(`Demo course distributed to ${response.data.users_updated} users`);
    } catch (error) {
      sonnerToast.error('Error distributing demo course');
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={distributeDemo}>Distribute Demo Course</Button>
          <Button onClick={() => setShowAddModal(true)}>Add New Product</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total_users || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total_products || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.paid_orders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{stats.total_revenue?.toFixed(2) || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded" />
                )}
                <div className="flex-grow">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-slate-600">{product.category}</p>
                  <p className="text-lg font-bold">{product.price === 0 ? 'FREE' : `₹${product.price}`}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingProduct(product)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          token={token}
          toast={toast}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            fetchProducts();
            fetchStats();
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ product, token, toast, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || 'software',
    features: product?.features?.join(', ') || '',
    video_url: product?.video_url || '',
  });
  const [image, setImage] = useState(null);
  const [downloadFile, setDownloadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('features', formData.features);
      formDataToSend.append('video_url', formData.video_url);
      formDataToSend.append('video_chapters', JSON.stringify([]));

      if (image) {
        formDataToSend.append('image', image);
      }
      if (downloadFile) {
        formDataToSend.append('download_file', downloadFile);
      }

      const url = product
        ? `${API}/admin/products/${product.id}`
        : `${API}/admin/products`;

      const method = product ? 'put' : 'post';

      await axios[method](url, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      sonnerToast.success(product ? 'Product updated!' : 'Product created!');
      onSuccess();
    } catch (error) {
      sonnerToast.error('Operation failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg max-w-2xl w-full my-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Price (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="software">Software</option>
                    <option value="course">Course</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Features (comma-separated)</label>
                <Input
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Feature 1, Feature 2, Feature 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Video URL (optional)</label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://example.com/video.mp4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Product Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                />
                {product?.image_url && !image && (
                  <p className="text-sm text-slate-600 mt-1">Current image will be kept if not changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Download File (PDF, ZIP, etc.)</label>
                <Input
                  type="file"
                  onChange={(e) => setDownloadFile(e.target.files[0])}
                />
                {product?.download_link && !downloadFile && (
                  <p className="text-sm text-slate-600 mt-1">Current file will be kept if not changed</p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Uploading...' : (product ? 'Update Product' : 'Create Product')}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default App;
