import React, { useState, useEffect, useMemo } from 'react';
import api from './api';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  LogOut, 
  Boxes, 
  AlertCircle, 
  CheckCircle,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  CircleDollarSign
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleAuthLogout = () => {
      setToken(null);
      setCurrentUser(null);
    };
    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, []);

  const handleLoginSuccess = (accessToken, refreshToken, user) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    setToken(accessToken);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/api/auth/logout', { refresh_token: refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setToken(null);
      setCurrentUser(null);
    }
  };

  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ProductDashboard 
      user={currentUser} 
      onLogout={handleLogout} 
    />
  );
}

// -------------------------------------------------------------
// LOGIN COMPONENT (Clean & Private)
// -------------------------------------------------------------
function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { username: username.trim(), password });
      if (res.data.status === 'success' || res.data.access_token) {
        onLoginSuccess(
          res.data.access_token, 
          res.data.refresh_token, 
          res.data.user || { username }
        );
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid username or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="icon-wrap">
            <Package size={26} strokeWidth={2.2} />
          </div>
          <h2>ADDR - PRODUCTS</h2>
          <p>Sign in to manage inventory</p>
        </div>

        {error && (
          <div className="alert-error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// DASHBOARD COMPONENT (Black & White Interactive)
// -------------------------------------------------------------
function ProductDashboard({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Modals state
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  
  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/products');
      const list = res.data?.data || res.data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast('Failed to load products from API', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and Sorted Products
  const processedProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = products.filter(p => 
      p.product_name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'id' || sortField === 'quantity') {
        aVal = parseInt(aVal, 10) || 0;
        bVal = parseInt(bVal, 10) || 0;
      } else if (sortField === 'price') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, search, sortField, sortDirection]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalCount = products.length;
    const totalQuantity = products.reduce((acc, p) => acc + (parseInt(p.quantity, 10) || 0), 0);
    const totalValue = products.reduce((acc, p) => {
      const price = parseFloat(p.price) || 0;
      const qty = parseInt(p.quantity, 10) || 0;
      return acc + (price * qty);
    }, 0);

    return { totalCount, totalQuantity, totalValue };
  }, [products]);

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setModalMode('create');
  };

  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setModalMode('edit');
  };

  const handleSaveProduct = async (formData) => {
    try {
      if (modalMode === 'create') {
        const res = await api.post('/api/products', formData);
        showToast(res.data?.message || 'Product created successfully!');
      } else if (modalMode === 'edit' && selectedProduct) {
        const res = await api.put(`/api/products/${selectedProduct.id}`, formData);
        showToast(res.data?.message || 'Product updated successfully!');
      }
      setModalMode(null);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error saving product';
      showToast(msg, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProduct) return;
    try {
      await api.delete(`/api/products/${deleteProduct.id}`);
      showToast('Product deleted successfully');
      setDeleteProduct(null);
      fetchProducts();
    } catch (err) {
      showToast('Failed to delete product', 'error');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: '4px' }} />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ marginLeft: '4px', color: '#ffffff' }} />
      : <ArrowDown size={12} style={{ marginLeft: '4px', color: '#ffffff' }} />;
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 100,
          background: '#18181b',
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#ffffff'}`,
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} color="#ef4444" /> : <CheckCircle size={16} color="#ffffff" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Package size={18} strokeWidth={2.4} />
          </div>
          <span>ADDR - PRODUCTS</span>
        </div>


        <div className="nav-actions">
          <div className="user-badge">
            <div className="user-avatar">
              {(user?.username?.[0] || 'A').toUpperCase()}
            </div>
            <span>{user?.username || 'admin'}</span>
          </div>

          <button onClick={onLogout} className="btn btn-secondary" title="Sign out">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="main-content">
        {/* Dynamic Metric Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Boxes size={22} />
            </div>
            <div className="stat-info">
              <h4>Total Items</h4>
              <div className="stat-value">{stats.totalCount}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Layers size={22} />
            </div>
            <div className="stat-info">
              <h4>Total Units in Stock</h4>
              <div className="stat-value">{stats.totalQuantity.toLocaleString()}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <CircleDollarSign size={22} />
            </div>
            <div className="stat-info">
              <h4>Total Inventory Value</h4>
              <div className="stat-value">₱{stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Product Table Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-title">Products</div>
              <span className="card-count">{processedProducts.length} items</span>
            </div>

            <div className="card-actions">
              <div className="search-wrapper">
                <Search size={15} className="search-icon" />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button onClick={handleOpenCreate} className="btn btn-primary">
                <Plus size={15} strokeWidth={2.5} />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="sortable" style={{ width: '70px' }} onClick={() => handleSort('id')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      ID {renderSortIndicator('id')}
                    </span>
                  </th>
                  <th className="sortable" onClick={() => handleSort('product_name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Product Name {renderSortIndicator('product_name')}
                    </span>
                  </th>
                  <th>Description</th>
                  <th className="sortable" style={{ width: '130px' }} onClick={() => handleSort('price')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Price (₱) {renderSortIndicator('price')}
                    </span>
                  </th>
                  <th className="sortable" style={{ width: '110px' }} onClick={() => handleSort('quantity')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Stock {renderSortIndicator('quantity')}
                    </span>
                  </th>
                  <th style={{ width: '120px' }}>Created</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : processedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  processedProducts.map((p) => {
                    const qty = parseInt(p.quantity, 10) || 0;
                    return (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                          #{p.id}
                        </td>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>
                          {p.product_name}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', maxWidth: '320px', fontSize: '0.825rem' }}>
                          {p.description || <span style={{ color: 'var(--text-muted)' }}>No description</span>}
                        </td>
                        <td>
                          <span className="price-text">
                            ₱{parseFloat(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${qty > 10 ? 'badge-in-stock' : qty > 0 ? 'badge-low-stock' : 'badge-out-of-stock'}`}>
                            {qty} pcs
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleOpenEdit(p)} 
                              className="btn-icon" 
                              title="Edit item"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => setDeleteProduct(p)} 
                              className="btn-icon delete" 
                              title="Delete item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {modalMode && (
        <ProductFormModal 
          mode={modalMode}
          product={selectedProduct}
          onClose={() => setModalMode(null)}
          onSave={handleSaveProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button onClick={() => setDeleteProduct(null)} className="btn-icon">
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to delete <strong style={{ color: '#ffffff' }}>{deleteProduct.product_name}</strong>?
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.5rem' }}>
                This record will be permanently removed from the Aiven MySQL database.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteProduct(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="btn btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// PRODUCT FORM MODAL
// -------------------------------------------------------------
function ProductFormModal({ mode, product, onClose, onSave }) {
  const [productName, setProductName] = useState(product?.product_name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price || '');
  const [quantity, setQuantity] = useState(product?.quantity ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }
    if (price === '' || isNaN(price) || parseFloat(price) < 0) {
      setError('Please provide a valid price (₱)');
      return;
    }
    if (quantity === '' || isNaN(quantity) || parseInt(quantity, 10) < 0) {
      setError('Please provide a valid stock quantity');
      return;
    }

    onSave({
      product_name: productName.trim(),
      description: description.trim(),
      price: parseFloat(price).toFixed(2),
      quantity: parseInt(quantity, 10),
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{mode === 'create' ? 'Add New Product' : 'Edit Product'}</h3>
          <button onClick={onClose} className="btn-icon">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Product Name *</label>
              <input 
                type="text" 
                className="form-control" 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Mechanical Gaming Keyboard"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                className="form-control" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description and specifications"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price (₱) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className="form-control" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  className="form-control" 
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'create' ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
