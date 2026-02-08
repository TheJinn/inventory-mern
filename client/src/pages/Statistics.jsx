import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

// Use Home page styles for the chart + Top Products card to keep design identical
import homeStyles from './Home.module.css';
import styles from './Statistics.module.css';

// ----- chart helpers (same approach as Home: tolerant to backend shape changes) -----
function firstArray(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
  }
  return null;
}

function pickSeriesRoot(root, view) {
  const v = view === 'weekly' ? 'weekly' : 'monthly';
  return (
    firstArray(
      root?.series?.[v],
      root?.salesPurchaseSeries?.[v],
      root?.salesAndPurchaseSeries?.[v],
      root?.chartSeries?.[v],
      root?.graphSeries?.[v],
      root?.chart?.[v],
      root?.graph?.[v],
      root?.[`${v}Series`],
      root?.[`${v}SalesPurchaseSeries`],
      root?.[`${v}SalesAndPurchaseSeries`],
      root?.[v]
    ) || null
  );
}

function normalizeSeries(raw, view) {
  if (!raw) return [];

  // Shape: { labels: [], sales: [], purchase: [] }
  if (!Array.isArray(raw) && typeof raw === 'object') {
    const labels = raw.labels || raw.label || raw.x || raw.axis || null;
    const sales = raw.sales || raw.sale || raw.sold || raw.revenue || null;
    const purchase = raw.purchase || raw.purchases || raw.cost || raw.buy || null;

    if (Array.isArray(labels) && (Array.isArray(sales) || Array.isArray(purchase))) {
      return labels.map((lbl, idx) => ({
        label: String(lbl),
        sales: Number((sales || [])[idx] ?? 0),
        purchase: Number((purchase || [])[idx] ?? 0)
      }));
    }
  }

  const arr = Array.isArray(raw) ? raw : [];
  const fallbackLabels = (() => {
    if (view === 'weekly') {
      // last 7 days labels (including today) -> "Mon", "Tue", ...
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d.toLocaleString('en', { weekday: 'short' });
      });
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  })();

  return arr
    .map((d, idx) => {
      const label = d?.label ?? d?.month ?? d?.day ?? d?.name ?? fallbackLabels[idx] ?? String(idx + 1);
      const sales = Number(d?.sales ?? d?.salesValue ?? d?.revenue ?? d?.totalSales ?? 0);
      const purchase = Number(d?.purchase ?? d?.purchaseValue ?? d?.cost ?? d?.totalPurchase ?? 0);
      return { label: String(label), sales, purchase };
    })
    .filter((d) => d.label);
}

function pickNumber(obj, keys, fallback = 0) {
  if (!obj) return fallback;
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return fallback;
}

function pickArray(obj, keys) {
  if (!obj) return [];
  for (const k of keys) {
    const v = obj?.[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

const nf = new Intl.NumberFormat('en-IN');
const formatINR = (n) => `₹${nf.format(Math.round(Number(n || 0)))}`;

// Inline icons (kept lightweight)
function Svg({ children }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}

const CardIcons = {
  sold: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.5">
      <path d="M13.3335 3.33325H2.66683C1.93045 3.33325 1.3335 3.93021 1.3335 4.66659V11.3333C1.3335 12.0696 1.93045 12.6666 2.66683 12.6666H13.3335C14.0699 12.6666 14.6668 12.0696 14.6668 11.3333V4.66659C14.6668 3.93021 14.0699 3.33325 13.3335 3.33325Z" stroke="#020617" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1.3335 6.66675H14.6668" stroke="#020617" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>

  ),
  stock: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.5">
      <path d="M14.6668 8H12.0002L10.0002 14L6.00016 2L4.00016 8H1.3335" stroke="#020617" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>

  )
};

export default function Statistics() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('weekly');

  useEffect(() => {
    let mounted = true;
    api
      .dashboard()
      .then((res) => {
        const payload = res && typeof res === 'object' && 'data' in res ? res.data : res;
        if (mounted) setData(payload);
      })
      .catch(() => {
        if (mounted) setData(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const root = useMemo(() => {
    if (!data) return {};
    return data?.data && typeof data.data === 'object' ? data.data : data;
  }, [data]);

  // KPI numbers (same keys tolerance as Home)
  const salesSrc = root.salesOverview || root.sales || root.summary || root.totals || root;
  const invSrc = root.inventorySummary || root.inventory || root.stock || root;

  const totalRevenue = pickNumber(salesSrc, ['revenue', 'salesRevenue', 'totalRevenue', 'sales', 'totalSales', 'amount'], 0);
  const productsSold = pickNumber(salesSrc, ['salesQty', 'soldQty', 'qtySold', 'productsSold', 'qty', 'count'], 0);
  const productsInStock = pickNumber(invSrc, ['inStock', 'inStockItems', 'totalStockQty', 'stockItems', 'qty', 'totalQty'], 0);

  // Chart series (identical behavior to Home)
  const series = useMemo(() => {
    const raw = pickSeriesRoot(root, view) || [];
    return normalizeSeries(raw, view);
  }, [root, view]);

  const maxVal = useMemo(() => {
    if (!series.length) return 1000;
    const raw = Math.max(...series.map((d) => Math.max(Number(d.sales || 0), Number(d.purchase || 0))));
    const step = raw <= 5000 ? 1000 : raw <= 25000 ? 5000 : 10000;
    return Math.max(step, Math.ceil(raw / step) * step);
  }, [series]);

  const yTicks = useMemo(() => {
    const steps = 5;
    return Array.from({ length: steps + 1 }, (_, i) => (maxVal * i) / steps).reverse();
  }, [maxVal]);

  const topProducts = useMemo(() => {
    const arr = pickArray(root, ['topSelling', 'topProducts', 'top_products']);
    return arr.slice(0, 6).map((item, idx) => {
      const p = item?.product ?? item;
      const name = p?.name ?? item?.name ?? item?.title ?? `Product ${idx + 1}`;
      const imageUrl = p?.imageUrl ?? p?.image ?? item?.imageUrl ?? item?.image ?? '';
      return { name, imageUrl };
    });
  }, [root]);

  return (
    <div className={homeStyles.page}>
      <div className={homeStyles.topbar}>
        <div className={homeStyles.pageTitle}>Statistics</div>
      </div>
      <div className={homeStyles.headerDivider} />

      {/* KPI cards */}
      <div className={styles.kpiRow}>
        <div className={`${styles.kpiCard} ${styles.kpiRevenue}`}>
          <div className={styles.kpiTop}>
            <div>
              <div className={styles.kpiLabel}>Total Revenue</div>
              <div className={styles.kpiValue}>{formatINR(totalRevenue)}</div>
              <div className={styles.kpiSub}>+20.1% from last month</div>
            </div>
            <div className={styles.kpiIcon} aria-hidden>
              ₹
            </div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiSold}`}>
          <div className={styles.kpiTop}>
            <div>
              <div className={styles.kpiLabel}>Products Sold</div>
              <div className={styles.kpiValue}>{nf.format(Math.round(productsSold || 0))}</div>
              <div className={styles.kpiSub}>+180.1% from last month</div>
            </div>
            <div className={styles.kpiIcon} aria-hidden>
              {CardIcons.sold}
            </div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiStock}`}>
          <div className={styles.kpiTop}>
            <div>
              <div className={styles.kpiLabel}>Products In Stock</div>
              <div className={styles.kpiValue}>{nf.format(Math.round(productsInStock || 0))}</div>
              <div className={styles.kpiSub}>+19% from last month</div>
            </div>
            <div className={styles.kpiIcon} aria-hidden>
              {CardIcons.stock}
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Top products (same layout as design) */}
      <div className={styles.mainGrid}>
        {/* Chart card: copied 1:1 from Home (fixes stacked x-axis + missing bars) */}
        <div className={homeStyles.chartCard}>
          <div className={homeStyles.chartHeader}>
            <h3 className={homeStyles.chartTitle}>Sales &amp; Purchase</h3>
            <div className={homeStyles.periodSelectWrap}>
              <span className={homeStyles.calendarIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 2v3M17 2v3M3.5 9h17" stroke="#6E7190" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6 5h12a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" stroke="#6E7190" strokeWidth="2" />
                </svg>
              </span>
              <select className={homeStyles.periodSelect} value={view} onChange={(e) => setView(e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className={homeStyles.chartArea}>
            <div className={homeStyles.yAxis}>
              {yTicks.map((t) => (
                <div key={t} className={homeStyles.yTick}>
                  {t === 0 ? '0' : nf.format(Math.round(t))}
                </div>
              ))}
            </div>

            <div className={`${homeStyles.bars} ${view === 'weekly' ? homeStyles.bars7 : ''}`}>
              {series.map((d) => {
                const salesH = Math.max(2, (Number(d.sales || 0) / maxVal) * 270);
                const purH = Math.max(2, (Number(d.purchase || 0) / maxVal) * 270);
                return (
                  <div key={d.label} className={homeStyles.barGroup}>
                    <div className={homeStyles.barPair}>
                      <div className={homeStyles.barWrap}>
                        <div
                          className={homeStyles.barPurchase}
                          style={{ height: `${purH}px` }}
                          title={`Purchase: ${formatINR(d.purchase)}`}
                        />
                      </div>
                      <div className={homeStyles.barWrap}>
                        <div
                          className={homeStyles.barSales}
                          style={{ height: `${salesH}px` }}
                          title={`Sales: ${formatINR(d.sales)}`}
                        />
                      </div>
                    </div>
                    <div className={homeStyles.barLabel}>{d.label}</div>
                  </div>
                );
              })}
            </div>

            <div className={homeStyles.legend}>
              <div className={homeStyles.legendItem}>
                <span className={`${homeStyles.dot} ${homeStyles.dotPurchase}`} />
                Purchase
              </div>
              <div className={homeStyles.legendItem}>
                <span className={`${homeStyles.dot} ${homeStyles.dotSales}`} />
                Sales
              </div>
            </div>
          </div>
        </div>

        {/* Top Products card: copied from Home (image + name only) */}
        <div className={homeStyles.topCard}>
          <h3 className={homeStyles.topTitle}>Top Products</h3>
          <div className={homeStyles.topList}>
            {topProducts.length ? (
              topProducts.map((p) => (
                <div key={p.name} className={homeStyles.topItem}>
                  <div className={homeStyles.topName}>{p.name}</div>
                  <img
                    className={homeStyles.topImg}
                    src={p.imageUrl || '/placeholder-52.svg'}
                    alt={p.name}
                  />
                </div>
              ))
            ) : (
              <div className={homeStyles.skeleton}>No data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
