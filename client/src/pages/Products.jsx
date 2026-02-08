import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Products.module.css';
import { api } from '../utils/api.js';
import Modal from '../components/Modal.jsx';

// --- helpers ---
function computeAvailability(product) {
  const qty = Number(product?.quantity ?? 0);
  const thr = Number(product?.thresholdValue ?? product?.threshold ?? 0);
  if (qty <= 0) return 'Out of stock';
  if (qty <= thr) return 'Low stock';
  return 'In-stock';
}

function formatINR(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '₹0';
  return `₹${Math.round(x).toLocaleString('en-IN')}`;
}

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_1_2229)">
      <path d="M33.4417 3.12073H14.1743V11.1108H37.5567V7.23415C37.5567 4.96579 35.7107 3.12073 33.4417 3.12073Z" fill="#00181B" fill-opacity="0.25"/>
      <path d="M22.5352 12.3403H0V4.92636C0 2.20972 2.21068 0 4.92828 0H12.1336C12.8497 0 13.5396 0.150925 14.1664 0.434509C15.0418 0.828964 15.7939 1.47913 16.3213 2.3286L22.5352 12.3403Z" fill="#00181B"/>
      <path d="M42 14.0001V37.8815C42 40.1527 40.1511 42 37.8789 42H4.12111C1.84891 42 0 40.1527 0 37.8815V9.88062H37.8789C40.1511 9.88062 42 11.7286 42 14.0001Z" fill="#00181B"/>
      <path d="M42 14.0001V37.8815C42 40.1527 40.1511 42 37.8789 42H21V9.88062H37.8789C40.1511 9.88062 42 11.7286 42 14.0001Z" fill="#00181B"/>
      <path d="M32.048 25.9398C32.048 32.0322 27.0919 36.9887 21.0001 36.9887C14.9083 36.9887 9.95215 32.0322 9.95215 25.9398C9.95215 19.8483 14.9083 14.8918 21.0001 14.8918C27.0919 14.8918 32.048 19.8483 32.048 25.9398Z" fill="white"/>
      <path d="M32.0479 25.9398C32.0479 32.0322 27.0918 36.9887 21 36.9887V14.8918C27.0918 14.8918 32.0479 19.8483 32.0479 25.9398Z" fill="#00181B" fill-opacity="0.25"/>
      <path d="M24.561 26.0754C24.3306 26.2705 24.0483 26.3657 23.7685 26.3657C23.4183 26.3657 23.0703 26.2173 22.8268 25.9283L22.2304 25.2214V29.8494C22.2304 30.5288 21.6793 31.0799 21 31.0799C20.3207 31.0799 19.7695 30.5288 19.7695 29.8494V25.2214L19.1732 25.9283C18.7342 26.4477 17.9584 26.514 17.439 26.0754C16.9199 25.6373 16.8532 24.8612 17.2913 24.3418L19.7269 21.4544C20.0444 21.0788 20.5078 20.8629 21 20.8629C21.4922 20.8629 21.9555 21.0788 22.2731 21.4544L24.7087 24.3418C25.1467 24.8612 25.0801 25.6373 24.561 26.0754Z" fill="#00181B"/>
      <path d="M24.561 26.0754C24.3306 26.2705 24.0483 26.3657 23.7686 26.3657C23.4183 26.3657 23.0703 26.2173 22.8268 25.9283L22.2305 25.2214V29.8494C22.2305 30.5288 21.6793 31.0799 21 31.0799V20.8629C21.4922 20.8629 21.9555 21.0788 22.2731 21.4544L24.7087 24.3418C25.1467 24.8612 25.0801 25.6373 24.561 26.0754Z" fill="#00181B"/>
      </g>
      <defs>
      <clipPath id="clip0_1_2229">
      <rect width="42" height="42" fill="white"/>
      </clipPath>
      </defs>
    </svg>

  );
}

// --- component ---
export default function Products() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  // Summary across all products (best effort)
  const [summaryAll, setSummaryAll] = useState(null);

  // Dashboard stats (revenue + top selling)
  const [dashboard, setDashboard] = useState(null);

  // Force refresh after mutations (add/buy/csv)
  const [reloadKey, setReloadKey] = useState(0);

  // Modals
  const [showAddChooser, setShowAddChooser] = useState(false);
  const [showAddOne, setShowAddOne] = useState(false);
  const [showAddCsv, setShowAddCsv] = useState(false);
  const [showCsvConfirm, setShowCsvConfirm] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  // Prevent double-submits (image upload to Cloudinary can take a moment)
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  const [buyOpen, setBuyOpen] = useState(false);
  const [buyProduct, setBuyProduct] = useState(null);
  const [buyQty, setBuyQty] = useState('');

  // Add single product
  const [form, setForm] = useState({
    name: '',
    productId: '',
    category: '',
    price: '',
    quantity: '',
    unit: '',
    expiryDate: '',
    thresholdValue: '',
    imageFile: null,
  });

  // CSV upload
  const fileRef = useRef(null);
  const [csvFile, setCsvFile] = useState(null);

  // Image upload
  const imageInputRef = useRef(null);

  // Local preview for selected image
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  // show preview for selected image
  useEffect(() => {
    if (!form.imageFile) {
      setImagePreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(form.imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  useEffect(() => {
    if (!form.imageFile) {
      setImagePreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(form.imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  // --- data fetch ---
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr('');
      try {
        const res = await api.products({ page, limit, q: query });
        if (cancelled) return;

        const list = res?.items ?? res?.data ?? res?.products ?? [];
        setItems(Array.isArray(list) ? list : []);

        const tp = res?.totalPages ?? res?.pagination?.totalPages ?? 1;
        setTotalPages(Math.max(1, Number(tp) || 1));

        // Some backends include summary in the same response
        const sum = res?.summary ?? res?.meta?.summary ?? null;
        if (sum && typeof sum === 'object') setSummaryAll(sum);
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, limit, query, reloadKey]);

  // Fetch dashboard stats used by Overall Inventory card (revenue + top selling)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const d = await api.dashboard();
        if (!cancelled) setDashboard(d);
      } catch {
        // non-blocking
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Best-effort overall summary: try a dedicated summary endpoint; otherwise fallback to current items.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (typeof api.productsSummary === 'function') {
          const s = await api.productsSummary();
          if (!cancelled && s && typeof s === 'object') setSummaryAll(s);
          return;
        }

        // Try a large fetch for summary only (if backend supports it)
        const res = await api.products({ page: 1, limit: 5000, q: '' });
        const list = res?.items ?? res?.data ?? res?.products ?? [];
        if (!cancelled && Array.isArray(list) && list.length) {
          setSummaryAll({ __fromClient: true, items: list });
        }
      } catch {
        // ignore and fallback to current page summary
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const allForSummary = useMemo(() => {
    if (!summaryAll) return null;
    if (Array.isArray(summaryAll.items)) return summaryAll.items;
    if (Array.isArray(summaryAll.products)) return summaryAll.products;
    if (Array.isArray(summaryAll.__items)) return summaryAll.__items;
    if (Array.isArray(summaryAll.itemsAll)) return summaryAll.itemsAll;
    if (Array.isArray(summaryAll)) return summaryAll;
    return null;
  }, [summaryAll]);

  const overall = useMemo(() => {
    // Prefer backend dashboard stats (sales revenue + top selling) when available
    if (dashboard && typeof dashboard === 'object') {
      const categoriesCount = Number(dashboard?.productSummary?.categories ?? 0) || 0;
      const totalProducts = Number(dashboard?.productSummary?.totalProducts ?? 0) || 0;
      const lowStock = Number(dashboard?.inventorySummary?.lowStock ?? 0) || 0;
      const outOfStock = Number(dashboard?.inventorySummary?.outOfStock ?? 0) || 0;
      const revenue = Number(dashboard?.salesOverview?.revenue ?? 0) || 0;
      const topSellingQty = Number(dashboard?.topSelling?.[0]?.qty ?? 0) || 0;
      const topSellingRevenue = Number(dashboard?.topSelling?.[0]?.amount ?? 0) || 0;
      return {
        categoriesCount,
        totalQty: totalProducts,
        totalAmount: revenue,
        topSellingCount: topSellingQty,
        topSellingRevenue,
        lowStock,
        outOfStock
      };
    }

    const base = allForSummary || items;
    const categories = new Set();
    let totalQty = 0;
    let totalAmount = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const p of base) {
      const cat = (p?.category ?? '').toString().trim();
      if (cat) categories.add(cat);

      const qty = safeNumber(p?.quantity);
      const thr = safeNumber(p?.thresholdValue ?? p?.threshold);
      totalQty += qty;
      totalAmount += qty * safeNumber(p?.salesPrice ?? p?.price);

      if (qty <= 0) outOfStock += 1;
      else if (qty <= thr) lowStock += 1;
    }

    // Top selling summary (best effort): if backend provides it, use it
    const topSellingCount = safeNumber(summaryAll?.topSellingCount ?? summaryAll?.topProductsCount);
    const topSellingRevenue = safeNumber(summaryAll?.topSellingRevenue ?? summaryAll?.topProductsRevenue);

    return {
      categoriesCount: safeNumber(summaryAll?.categoriesCount ?? summaryAll?.categories ?? categories.size) || categories.size,
      totalQty: safeNumber(summaryAll?.totalProducts ?? summaryAll?.totalQty ?? totalQty) || totalQty,
      totalAmount: safeNumber(summaryAll?.totalAmount ?? summaryAll?.amount ?? totalAmount) || totalAmount,
      topSellingCount,
      topSellingRevenue,
      lowStock: safeNumber(summaryAll?.lowStock ?? lowStock) || lowStock,
      outOfStock: safeNumber(summaryAll?.outOfStock ?? summaryAll?.notInStock ?? outOfStock) || outOfStock,
    };
  }, [allForSummary, items, summaryAll, dashboard]);

  // Top products list (right side in overall card)
  const topProducts = useMemo(() => {
    if (dashboard?.topSelling && Array.isArray(dashboard.topSelling) && dashboard.topSelling.length) {
      return dashboard.topSelling;
    }
    const a = summaryAll?.topProducts || summaryAll?.topSellingProducts || [];
    if (Array.isArray(a) && a.length) return a;
    // Fallback: highest price products
    return [...items]
      .sort((x, y) => safeNumber(y.salesPrice ?? y.price) - safeNumber(x.salesPrice ?? x.price))
      .slice(0, 1);
  }, [summaryAll, items, dashboard]);

  // --- handlers ---
  function openChooser() {
    setShowAddChooser(true);
  }

  function chooseIndividual() {
    setShowAddChooser(false);
    setShowAddOne(true);
  }

  function chooseMultiple() {
    setShowAddChooser(false);
    setShowAddCsv(true);
  }

  function onRowClick(p) {
    setBuyProduct(p);
    setBuyQty('');
    setBuyOpen(true);
  }

  async function submitBuy() {
    if (!buyProduct) return;
    const qty = Math.max(0, Math.floor(Number(buyQty)));
    if (!qty) return;
    try {
      await api.buyProduct(buyProduct._id || buyProduct.id, { qty });
      setBuyOpen(false);
      setReloadKey((k) => k + 1);
    } catch (e) {
      alert(e?.message || 'Failed to buy product');
    }
  }

  function setField(key, val) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function submitOne(e) {
    e.preventDefault();
    if (isSubmittingProduct) return;
    setIsSubmittingProduct(true);
    try {
      const fd = new FormData();
      // Product ID is auto-generated on submit (read-only in UI)
      fd.append('name', form.name);
      fd.append('category', form.category);
      fd.append('price', form.price);
      fd.append('quantity', form.quantity);
      fd.append('unit', form.unit);
      fd.append('expiryDate', form.expiryDate);
      // backend expects `threshold`
      fd.append('threshold', form.thresholdValue);
      if (form.imageFile) fd.append('image', form.imageFile);

      await api.createProduct(fd);

      setShowAddOne(false);
      setForm({ name: '', productId: '', category: '', price: '', quantity: '', unit: '', expiryDate: '', thresholdValue: '', imageFile: null });
      setImagePreviewUrl('');
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (e2) {
      alert(e2?.message || 'Failed to add product');
    } finally {
      setIsSubmittingProduct(false);
    }
  }

  function pickCsvFile(file) {
    if (!file) return;
    setCsvFile(file);
  }

  async function uploadCsv() {
    if (!csvFile) return;
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      const res = await api.uploadProductsCsv(fd);
      setCsvResult(res || { ok: true });
      setShowAddCsv(false);
      setShowCsvConfirm(true);
      setCsvFile(null);
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (e) {
      alert(e?.message || 'CSV upload failed');
    }
  }

  // --- render ---
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.pageTitle}>Product</div>
        <div className={styles.searchWrap}>
          <div className={styles.searchPill}>
            <span className={styles.searchIcon}><SearchIcon /></span>
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search here..."
            />
          </div>
        </div>
      </header>

      <div className={styles.headerDivider} aria-hidden />

      <div className={styles.overallCard}
      >
        <div className={styles.overallTitle}>Overall Inventory</div>

        <div className={styles.overallGrid}>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Categories</div>
            <div className={styles.metricNums + ' ' + styles.oneCol}>
              <div className={styles.metricPair}>
                <div className={styles.metricBig}>{overall.categoriesCount}</div>
                <div className={styles.metricSub}>Last 7 days</div>
              </div>
            </div>
          </div>

          <div className={styles.metric}>
            <div className={styles.metricLabel}>Total Products</div>
            <div className={styles.metricNums}>
              <div className={styles.metricPair}>
                <div className={styles.metricBig}>{overall.totalQty}</div>
                <div className={styles.metricSub}>Last 7 days</div>
              </div>
              <div className={styles.metricPair}>
                <div className={styles.metricBig}>{formatINR(overall.totalAmount)}</div>
                <div className={styles.metricSub}>Amount</div>
              </div>
            </div>
          </div>

          <div className={styles.metric}>
            <div className={styles.metricLabel}>Top Selling</div>
            <div className={styles.metricNums}>
              <div className={styles.metricPair}>
                <div className={styles.metricBig}>{overall.topSellingCount || 0}</div>
                <div className={styles.metricSub}>Last 7 days</div>
              </div>
              <div className={styles.metricPair}>
                <div className={styles.metricBig}>{formatINR(overall.topSellingRevenue || 0)}</div>
                <div className={styles.metricSub}>Revenue</div>
              </div>
            </div>
          </div>

          <div className={styles.metric}>
            <div className={styles.metricLabel}>Low Stocks</div>
            <div className={styles.metricNums}>
              <div className={styles.metricPair}>
                <div className={styles.metricBig}>{overall.lowStock}</div>
                <div className={styles.metricSub}>Low Stock</div>
              </div>
              <div className={styles.metricPair}>
                <div className={styles.metricBig}>{overall.outOfStock}</div>
                <div className={styles.metricSub}>Not in stock</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.productsCard}>
        <div className={styles.productsHead}>
          <div className={styles.productsTitle}>Products</div>
          <button type="button" className={styles.addBtn} onClick={openChooser}>Add Product</button>
        </div>

        {err ? <div className={styles.state}>{err}</div> : null}

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Products</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Threshold Value</th>
              <th>Expiry Date</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.state}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className={styles.state}>No products found</td></tr>
            ) : (
              items.map((p) => {
                const avail = computeAvailability(p);
                const key = p._id || p.id;
                return (
                  <tr key={key} className={styles.row} onClick={() => onRowClick(p)}>
                    <td className={styles.productCell}>{p.name || p.productName}</td>
                    <td>{formatINR(p.salesPrice ?? p.price)}</td>
                    <td>{p.quantity}</td>
                    <td>{p.thresholdValue ?? p.threshold ?? '-'}</td>
                    <td>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td>
                      <span className={avail === 'In-stock' ? styles.avIn : avail === 'Low stock' ? styles.avLow : styles.avOut}>{avail}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <button className={styles.pBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <div className={styles.pageInfo}>Page {page} of {totalPages}</div>
          <button className={styles.pBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      <Modal open={showAddChooser} onClose={() => setShowAddChooser(false)}>
        <div className={styles.chooseModal}>
          <div className={styles.chooseButtons}>
            <button type="button" className={styles.choiceBtn} onClick={chooseIndividual}>individual product</button>
            <button type="button" className={styles.choiceBtn} onClick={chooseMultiple}>Multiple product</button>
          </div>
        </div>
      </Modal>

      <Modal open={showAddOne} onClose={() => setShowAddOne(false)}>
        <div className={styles.formModal}>
          <div className={styles.breadcrumb}>Add Product › Individual Product</div>
          <div className={styles.formCard}>
            <div className={styles.formTitle}>New Product</div>
            <form className={styles.formGrid} onSubmit={submitOne} method="post" action="#">
              <div className={styles.imageRow}>
                <div
                  className={styles.imageBox}
                  role="button"
                  tabIndex={0}
                  onClick={() => imageInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click();
                  }}
                >
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Selected" className={styles.previewImg} />
                  ) : null}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setField('imageFile', e.target.files?.[0] || null)}
                    className={styles.hidden}
                  />
                </div>
                <div className={styles.imageHint}>
                  Drag image here<br />or
                  <label className={styles.browseLink}>
                    Browse image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setField('imageFile', e.target.files?.[0] || null)}
                      className={styles.hidden}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Product Name</div>
                <input className={styles.fInput} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Enter product name" required />
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Product ID</div>
                <input
                  className={styles.fInput}
                  value=""
                  placeholder="Auto-generated"
                  disabled
                  aria-disabled="true"
                />
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Category</div>
                <input className={styles.fInput} value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="Select product category" required />
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Price</div>
                <input className={styles.fInput} value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="Enter price" inputMode="numeric" required />
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Quantity</div>
                <input className={styles.fInput} value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} placeholder="Enter product quantity" inputMode="numeric" required />
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Unit</div>
                <input className={styles.fInput} value={form.unit} onChange={(e) => setField('unit', e.target.value)} placeholder="Enter product unit" required />
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Expiry Date</div>
                <input type="date" className={styles.fInput} value={form.expiryDate} onChange={(e) => setField('expiryDate', e.target.value)} placeholder="Enter expiry date" />
              </div>

              <div className={styles.fRow}>
                <div className={styles.fLabel}>Threshold Value</div>
                <input className={styles.fInput} value={form.thresholdValue} onChange={(e) => setField('thresholdValue', e.target.value)} placeholder="Enter threshold value" inputMode="numeric" required />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.discard} onClick={() => setShowAddOne(false)}>Discard</button>
                {/*
                  Some environments may still attempt a native navigation when pressing Enter in a
                  modal form (showing GET /api/products/create). We trigger the submit handler
                  explicitly to guarantee an XHR POST.
                */}
                <button
                  type="button"
                  className={styles.submit}
                  onClick={submitOne}
                  disabled={isSubmittingProduct}
                  aria-busy={isSubmittingProduct}
                >
                  {isSubmittingProduct ? (
                    <span className={styles.btnInner}>
                      <span className={styles.spinner} aria-hidden="true" />
                      Submitting...
                    </span>
                  ) : (
                    'Add Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      <Modal open={showAddCsv} onClose={() => setShowAddCsv(false)}>
        <div className={styles.csvModal}>
          <div className={styles.csvHeadRow}>
            <div>
              <div className={styles.csvTitle}>CSV Upload</div>
              <div className={styles.csvSub}>Add your documents here</div>
            </div>
            <button className={styles.closeX} onClick={() => setShowAddCsv(false)}>×</button>
          </div>

          <div
            className={styles.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickCsvFile(e.dataTransfer.files?.[0]);
            }}
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
          >
            <div className={styles.dropIcon}><UploadIcon /></div>
            <div className={styles.dropText}>Drag your file(s) to start uploading</div>
            <div className={styles.dropOr}>OR</div>
            <button type="button" className={styles.browseBtn} onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>Browse files</button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className={styles.hidden}
              onChange={(e) => pickCsvFile(e.target.files?.[0])}
            />
          </div>

          {csvFile ? (
            <div className={styles.fileRow}>
              <div className={styles.fileBadge}>CSV</div>
              <div className={styles.fileMeta}>
                <div className={styles.fileName}>{csvFile.name}</div>
                <div className={styles.fileSize}>{(csvFile.size / (1024 * 1024)).toFixed(1)}MB</div>
              </div>
              <button className={styles.fileRemove} onClick={() => setCsvFile(null)}>×</button>
            </div>
          ) : null}

          <div className={styles.csvActions}>
            <button className={styles.cancelBtn} onClick={() => setShowAddCsv(false)}>Cancel</button>
            <button className={styles.uploadBtn} onClick={uploadCsv} disabled={!csvFile}>Upload</button>
          </div>
        </div>
      </Modal>

      <Modal open={showCsvConfirm} onClose={() => setShowCsvConfirm(false)}>
        <div className={styles.csvConfirm}>
          <div className={styles.csvConfirmTitle}>Upload Details</div>
          <div className={styles.csvConfirmText}>
            {csvResult?.message || 'Your CSV file has been processed.'}
          </div>
          <button className={styles.okBtn} onClick={() => setShowCsvConfirm(false)}>OK</button>
        </div>
      </Modal>

      <Modal open={buyOpen} onClose={() => setBuyOpen(false)}>
        <div className={styles.buyModal}>
          <button className={styles.buyPrimary}>Simulate Buy Product</button>
          <input
            className={styles.buyInput}
            value={buyQty}
            onChange={(e) => setBuyQty(e.target.value)}
            placeholder="Enter quantity"
            inputMode="numeric"
          />
          <button className={styles.buyBtn} onClick={submitBuy}>Buy</button>
        </div>
      </Modal>
    </div>
  );
}
