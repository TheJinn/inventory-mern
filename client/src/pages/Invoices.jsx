import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Invoices.module.css';
import { api } from '../utils/api.js';

function money(n){
  const v = Number(n||0);
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

function fmtDate(d){
  try{ return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }).replace(',', ''); }
  catch{ return ''; }
}

function normStatus(s){
  const v = String(s||'').trim().toLowerCase();
  if(v === 'paid') return 'Paid';
  if(v === 'unpaid') return 'Unpaid';
  return s || '';
}

export default function Invoices(){
  const [summary,setSummary]=useState(null);
  const [list,setList]=useState({ items:[], total:0, page:1, limit:10 });
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [search,setSearch]=useState('');

  const [menuFor,setMenuFor]=useState(null); // invoiceId
  const menuRef = useRef(null);

  const [viewId,setViewId]=useState(null);
  const [viewInvoice,setViewInvoice]=useState(null);
  const [viewLoading,setViewLoading]=useState(false);
  const invoiceRef = useRef(null);

  const [confirmDel,setConfirmDel]=useState(null); // invoice _id to confirm delete
  const [actionBusy,setActionBusy]=useState(false);
  const [justPaidId,setJustPaidId]=useState(null);

  async function load(page=1, nextSearch = search){
    try{
      setLoading(true); setErr('');
      const [s,l] = await Promise.all([
        api.invoiceSummary(),
        api.invoices({ page, limit:10, search: (nextSearch||'').trim() })
      ]);
      setSummary(s);
      setList(l);
    }catch(ex){
      setErr(ex.message||'Failed to load');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(1, ''); },[]);

  // debounce search
  useEffect(()=>{
    const t = setTimeout(()=>{
      load(1, search);
    }, 250);
    return ()=> clearTimeout(t);
  },[search]);

  // close action menu on outside click / esc
  useEffect(()=>{
    function onDown(e){
      if(!menuFor) return;
      if(menuRef.current && menuRef.current.contains(e.target)) return;
      setMenuFor(null);
      setConfirmDel(null);
    }
    function onEsc(e){ if(e.key==='Escape') { setMenuFor(null); setViewId(null); setConfirmDel(null);} }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return ()=>{ window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onEsc); };
  },[menuFor]);

  const totalPages = useMemo(()=> Math.max(1, Math.ceil((list.total||0)/(list.limit||10))), [list.total, list.limit]);

  async function openInvoice(inv){
    setMenuFor(null);
    setViewId(inv._id);
    setViewInvoice(null);
    setViewLoading(true);
    try{
      const d = await api.invoice(inv._id);
      setViewInvoice(d.invoice);
    }finally{
      setViewLoading(false);
    }
  }

  async function markPaid(inv){
    if(actionBusy) return;
    setActionBusy(true);
    try{
      await api.updateInvoiceStatus(inv._id, { status: 'Paid' });
      // optimistic update
      setList(prev=>({ ...prev, items: prev.items.map(x=> x._id===inv._id ? { ...x, status:'Paid' } : x) }));
      // keep the menu in the paid-state briefly (green bar) like the design
      setJustPaidId(inv._id);
      await load(list.page);
    }catch(e){
      setErr(e.message||'Failed to update');
    }finally{
      setActionBusy(false);
      // Keep menu open briefly to show the green Paid bar like the design
      setTimeout(()=>{ setMenuFor(null); setJustPaidId(null); }, 1200);
    }
  }

  async function deleteInvoice(inv){
    if(actionBusy) return;
    setActionBusy(true);
    try{
      await api.deleteInvoice(inv._id);
      setConfirmDel(null);
      await load(Math.min(list.page, totalPages));
    }catch(e){
      setErr(e.message||'Failed to delete');
    }finally{
      setActionBusy(false);
    }
  }

  async function downloadPdf(){
    if(!invoiceRef.current || !viewInvoice) return;
    // lazy load deps
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = canvas.height * (imgW / canvas.width);
    let y = 0;
    // If long, split across pages
    let remaining = imgH;
    while(remaining > 0){
      pdf.addImage(imgData, 'PNG', 0, y, imgW, imgH);
      remaining -= pageH;
      if(remaining > 0){
        pdf.addPage();
        y -= pageH;
      }
    }
    pdf.save(`${viewInvoice.invoiceId || 'invoice'}.pdf`);
  }

  function printInvoice(){
    if(!invoiceRef.current) return;
    const w = window.open('', '_blank', 'width=900,height=900');
    if(!w) return;
    const html = invoiceRef.current.outerHTML;
    w.document.write(`<!doctype html><html><head><title>Print</title>
      <style>
        body{margin:0;background:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
        .printWrap{padding:24px;}
        @page{margin:12mm;}
      </style>
    </head><body><div class="printWrap">${html}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(()=>{ w.print(); w.close(); }, 250);
  }

  function openMenu(e, inv){
    e.stopPropagation();
    setConfirmDel(null);
    setMenuFor(prev => (prev === inv._id ? null : inv._id));
  }

  return (
    <div className={styles.page}>
      {/* Top header */}
      <div className={styles.topbar}>
        <div className={styles.pageTitle}>Invoice</div>
        <div className={styles.searchPill}>
          <span className={styles.searchIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            className={styles.searchInput}
            placeholder="Search here..."
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.headerLine} />

      {loading ? <div className={styles.state}>Loading...</div> : null}
      {err ? <div className={styles.error}>{err}</div> : null}

      {/* Overall Invoice Card */}
      {summary ? (
        <div className={styles.overallCard}>
          <div className={styles.overallTitle}>Overall Invoice</div>
          <div className={styles.metricsRow}>
            <Metric
              title="Recent Transactions"
              main={summary.cards.recentTransactionsCount}
              subLeft="Last 7 days"
            />

            <Divider />

            <Metric
              title="Total Invoices"
              main={summary.cards.totalInvoices}
              mainRight={summary.cards.processedInvoices}
              subLeft="Total Till Date"
              subRight="Processed"
            />

            <Divider />

            <Metric
              title="Paid Amount"
              main={money(summary.cards.paidAmount)}
              mainRight={summary.cards.paidCustomers}
              subLeft="Last 7 days"
              subRight="customers"
            />

            <Divider />

            <Metric
              title="Unpaid Amount"
              main={money(summary.cards.unpaidAmount)}
              mainRight={summary.cards.unpaidCustomers}
              subLeft="Total Pending"
              subRight="Customers"
            />
          </div>
        </div>
      ) : null}

      {/* Invoice List */}
      <div className={styles.tableCard}>
        <div className={styles.tableTitle}>Invoices List</div>
        <div className={styles.tableHead}>
          <div>Invoice ID</div>
          <div>Reference Number</div>
          <div>Amount (₹)</div>
          <div>Status</div>
          <div>Due Date</div>
          <div className={styles.headRight}></div>
        </div>

        {list.items.map(inv=> (
          <div key={inv._id} className={styles.row}>
            <div className={styles.cell}><span className={styles.invId}>{inv.invoiceId}</span></div>
            <div className={styles.cell}><span className={styles.ref}>{inv.referenceNumber}</span></div>
            <div className={styles.cell}><span className={styles.amount}>{money(inv.amount)}</span></div>
            <div className={styles.cell}><span className={styles.statusText}>{normStatus(inv.status)}</span></div>
            <div className={styles.cell}><span className={styles.due}>{fmtDate(inv.dueDate)}</span></div>
            <div className={styles.cellRight}>
              <button type="button" className={styles.dotsBtn} onClick={(e)=>openMenu(e, inv)} aria-label="Options">
                <DotsIcon />
              </button>

              {menuFor===inv._id ? (
                <div ref={menuRef} className={styles.menu}>
                  {confirmDel===inv._id ? (
                    <div className={styles.confirmPopover}>
                      <div className={styles.confirmText}>this invoice will be deleted.</div>
                      <div className={styles.confirmBtns}>
                        <button type="button" className={styles.cancelBtn} disabled={actionBusy} onClick={()=>setConfirmDel(null)}>Cancel</button>
                        <button type="button" className={styles.confirmBtn} disabled={actionBusy} onClick={()=>deleteInvoice(inv)}>Confirm</button>
                      </div>
                    </div>
                  ) : justPaidId===inv._id ? (
                    <div className={styles.menuBarPaid}>
                      <MiniIcon kind="paid" />
                      <span>Paid</span>
                    </div>
                  ) : normStatus(inv.status) === 'Unpaid' ? (
                    <button type="button" className={styles.menuBarUnpaid} disabled={actionBusy} onClick={()=>markPaid(inv)}>
                      <MiniIcon kind="unpaid" />
                      <span>Unpaid</span>
                    </button>
                  ) : (
                    <div className={styles.menuBox}>
                      <button type="button" className={styles.menuItem} onClick={()=>openInvoice(inv)}>
                        <MiniIcon kind="view" />
                        <span>View Invoice</span>
                      </button>
                      <button type="button" className={styles.menuItem} onClick={()=>{ setConfirmDel(inv._id); }}>
                        <MiniIcon kind="delete" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div className={styles.pager}>
          <button className={styles.pageBtn} disabled={list.page<=1} onClick={()=>load(list.page-1)}>Previous</button>
          <div className={styles.pageText}>Page {list.page} of {totalPages}</div>
          <button className={styles.pageBtn} disabled={list.page>=totalPages} onClick={()=>load(list.page+1)}>Next</button>
        </div>
      </div>

      {/* Invoice View Overlay */}
      {viewId ? (
        <div className={styles.overlay}>
          <div className={styles.overlayInner}>
            <div className={styles.invoiceCardWrap}>
              <div className={styles.invoiceActions}>
                <button type="button" className={`${styles.actionCircle} ${styles.closeCircle}`} onClick={()=>setViewId(null)} aria-label="Close">
                  <CloseIcon />
                </button>
                <button type="button" className={`${styles.actionCircle} ${styles.downloadCircle}`} disabled={!viewInvoice || viewLoading} onClick={downloadPdf} aria-label="Download PDF">
                  <DownloadIcon />
                </button>
                <button type="button" className={`${styles.actionCircle} ${styles.printCircle}`} disabled={!viewInvoice || viewLoading} onClick={printInvoice} aria-label="Print">
                  <PrintIcon />
                </button>
              </div>

              <div className={styles.invoiceCard}>
                {viewLoading || !viewInvoice ? (
                  <div className={styles.invoiceLoading}>Loading invoice...</div>
                ) : (
                  <div ref={invoiceRef} className={styles.invoicePaper}>
                    <div className={styles.invoiceHeader}>
                      <div className={styles.invoiceTitle}>INVOICE</div>
                      <div className={styles.billGrid}>
                        <div>
                          <div className={styles.smallLabel}>Billed to</div>
                          <div className={styles.addrLine}>Company Name</div>
                          <div className={styles.addrLine}>Company address</div>
                          <div className={styles.addrLine}>City, Country - 00000</div>
                        </div>
                        <div className={styles.rightAddr}>
                          <div className={styles.smallLabel}>Business address</div>
                          <div className={styles.addrLine}>City, State, IN - 000 000</div>
                          <div className={styles.addrLine}>TAX ID 00XXXX1234XXX</div>
                        </div>
                      </div>
                    </div>

                    {/* Body layout exactly like the design: meta on left, items table on right */}
                    <div className={styles.bodyGrid}>
                      <div className={styles.metaCol}>
                        <div className={styles.metaRow}><div className={styles.metaKey}>Invoice #</div></div>
                        <div className={styles.metaRow}><div className={styles.metaVal}>{viewInvoice.invoiceId}</div></div>
                        <div className={styles.metaRow}><div className={styles.metaKey}>Invoice date</div></div>
                        <div className={styles.metaRow}><div className={styles.metaVal}>{fmtDate(viewInvoice.invoiceDate || viewInvoice.createdAt)}</div></div>
                        <div className={styles.metaRow}><div className={styles.metaKey}>Reference</div></div>
                        <div className={styles.metaRow}><div className={styles.metaVal}>{viewInvoice.referenceNumber}</div></div>
                        <div className={styles.metaRow}><div className={styles.metaKey}>Due date</div></div>
                        <div className={styles.metaRow}><div className={styles.metaVal}>{fmtDate(viewInvoice.dueDate)}</div></div>
                      </div>

                      <div className={styles.itemsTable}>
                        <div className={styles.itemsHead}>
                          <div>Products</div>
                          <div className={styles.center}>Qty</div>
                          <div className={styles.right}>Price</div>
                        </div>
                        {viewInvoice.items?.map((it,idx)=>(
                          <div key={idx} className={styles.itemsRow}>
                            <div className={styles.prodName}>{it.productName}</div>
                            <div className={`${styles.center} ${styles.qty}`}>{it.quantity}</div>
                            <div className={`${styles.right} ${styles.price}`}>{money(it.unitPrice)}</div>
                          </div>
                        ))}
                        <div className={styles.itemsTotals}>
                          <div className={styles.totalLine}><span>Subtotal</span><span>{money(viewInvoice.subtotal ?? (viewInvoice.amount - (viewInvoice.taxAmount||0)))}</span></div>
                          <div className={styles.totalLine}><span>Tax (10%)</span><span>{money(viewInvoice.taxAmount ?? (viewInvoice.amount*0.1))}</span></div>
                          <div className={styles.totalDue}><span>Total due</span><span>{money(viewInvoice.amount)}</span></div>
                        </div>
                        <div className={styles.payNote}>Please pay within 7 days of receiving this invoice.</div>
                      </div>
                    </div>

                    <div className={styles.invoiceFooter}>
                      <div>www.rechtoI.inc</div>
                      <div>+91 00000 00000</div>
                      <div>hello@email.com</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function Divider(){
  return <div className={styles.divider} />;
}

function Metric({ title, main, mainRight, subLeft, subRight }){
  return (
    <div className={styles.metric}>
      <div className={styles.metricTitle}>{title}</div>
      <div className={styles.metricGrid}>
        <div className={styles.metricLeft}>
          <div className={styles.metricMain}>{main}</div>
          <div className={styles.metricSub}>{subLeft}</div>
        </div>
        {mainRight!==undefined ? (
          <div className={styles.metricRightCol}>
            <div className={styles.metricRight}>{mainRight}</div>
            <div className={styles.metricSubRight}>{subRight}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DotsIcon(){
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="5" r="2" fill="currentColor"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
      <circle cx="12" cy="19" r="2" fill="currentColor"/>
    </svg>
  );
}

function MiniIcon({ kind }){
  // Simple inline icons to match the design feel
  if(kind==='paid'){
    return (
      <span className={`${styles.miniIcon} ${styles.miniGreen}`}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="18" height="18" rx="4" fill="#0BB2F4"/>
          <path d="M12.1733 10.6316L11.3114 11.4936L11.116 11.2983C10.8556 11.0378 10.4338 11.0378 10.1733 11.2983C9.91292 11.5587 9.91292 11.9806 10.1733 12.241L10.84 12.9076C10.9702 13.0378 11.1408 13.1029 11.3114 13.1029C11.4819 13.1029 11.6525 13.0378 11.7827 12.9076L13.116 11.5743C13.3765 11.3139 13.3765 10.892 13.116 10.6316C12.8556 10.3712 12.4338 10.3712 12.1733 10.6316Z" fill="black"/>
          <path d="M13.3077 8.39217C13.3181 8.13716 13.3333 7.88203 13.3333 7.62699C13.3333 6.25069 13.194 4.87764 12.9209 3.55147C12.833 3.10355 12.6647 2.68428 12.4205 2.30537C12.2265 2.00459 11.8297 1.91084 11.5205 2.09313L10.6487 2.60876L9.64546 2.07751C9.45015 1.97464 9.21643 1.97464 9.02112 2.07751L7.99996 2.61852L6.9788 2.07751C6.78348 1.97464 6.54976 1.97464 6.35445 2.07751L5.3512 2.60876L4.47945 2.09313C4.17118 1.91019 3.77404 2.00394 3.57938 2.30537C3.33524 2.68428 3.16695 3.10355 3.08036 3.54561C2.53121 6.21553 2.53121 9.03779 3.08004 11.7071C3.3206 12.8835 4.08785 13.8275 5.08232 14.17C6.03576 14.4994 7.01721 14.6667 7.99996 14.6667C8.47017 14.6667 8.94454 14.6179 9.41585 14.5408C10.0546 15.0448 10.8354 15.3334 11.6666 15.3334C13.6884 15.3334 15.3333 13.6882 15.3333 11.6667C15.3333 10.2549 14.5311 8.99613 13.3077 8.39217ZM5.51721 12.9095C4.9661 12.7194 4.53284 12.1569 4.38635 11.4395C3.87333 8.94535 3.87333 6.30797 4.38765 3.80797C4.40034 3.74287 4.41597 3.67841 4.43388 3.61527L4.99377 3.94665C5.19332 4.06513 5.43974 4.07035 5.64546 3.96227L6.66662 3.42126L7.68778 3.96227C7.8831 4.06514 8.11682 4.06514 8.31213 3.96227L9.33329 3.42126L10.3544 3.96227C10.5599 4.07035 10.8066 4.06514 11.0061 3.94665L11.5657 3.61592C11.5843 3.68037 11.6002 3.74678 11.6136 3.81449C11.8701 5.05797 12 6.34118 12 7.62699C12 7.75589 11.9987 7.88545 11.9957 8.01435C11.8873 8.00459 11.7776 8.00003 11.6666 8.00003C10.7601 8.00003 9.93094 8.33255 9.29028 8.87963C9.31343 8.81192 9.33329 8.74226 9.33329 8.6667C9.33329 8.29821 9.03479 8.00003 8.66662 8.00003H5.99996C5.63179 8.00003 5.33329 8.29821 5.33329 8.6667C5.33329 9.03519 5.63179 9.33337 5.99996 9.33337H8.66662C8.74218 9.33337 8.81193 9.31355 8.87964 9.2904C8.33252 9.93111 7.99996 10.7602 7.99996 11.6667C7.99996 11.8029 8.00903 11.9381 8.02404 12.0723C8.02892 12.116 8.03776 12.1589 8.04418 12.2024C8.05761 12.2929 8.07242 12.383 8.09248 12.4719C8.10351 12.5207 8.11722 12.5685 8.1302 12.6167C8.15254 12.6999 8.17684 12.7821 8.20483 12.8633C8.22115 12.9105 8.23856 12.9569 8.25675 13.0033C8.2889 13.0855 8.32422 13.166 8.36214 13.2456C8.37414 13.2708 8.38289 13.2974 8.39546 13.3223C7.42509 13.3744 6.45926 13.2351 5.51721 12.9095ZM11.6666 14C11.0608 14 10.4912 13.7728 10.0569 13.3549C9.59045 12.9147 9.33329 12.3151 9.33329 11.6667C9.33329 10.3802 10.3802 9.33337 11.6666 9.33337C11.9287 9.33337 12.1764 9.37438 12.417 9.45967C13.3639 9.77347 14 10.6602 14 11.6667C14 12.9532 12.9531 14 11.6666 14Z" fill="black"/>
          <path d="M6.00016 7.33333H7.3081C7.67627 7.33333 7.97477 7.03515 7.97477 6.66667C7.97477 6.29818 7.67627 6 7.3081 6H6.00016C5.632 6 5.3335 6.29818 5.3335 6.66667C5.3335 7.03515 5.632 7.33333 6.00016 7.33333Z" fill="black"/>
        </svg>
      </span>
    );
  }
  if(kind==='unpaid'){
    return (
      <span className={`${styles.miniIcon}`}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="18" height="18" rx="4" fill="#0BB2F4"/>
          <path d="M12.1733 10.6316L11.3114 11.4936L11.116 11.2983C10.8556 11.0378 10.4338 11.0378 10.1733 11.2983C9.91292 11.5587 9.91292 11.9806 10.1733 12.241L10.84 12.9076C10.9702 13.0378 11.1408 13.1029 11.3114 13.1029C11.4819 13.1029 11.6525 13.0378 11.7827 12.9076L13.116 11.5743C13.3765 11.3139 13.3765 10.892 13.116 10.6316C12.8556 10.3712 12.4338 10.3712 12.1733 10.6316Z" fill="black"/>
          <path d="M13.3077 8.39217C13.3181 8.13716 13.3333 7.88203 13.3333 7.62699C13.3333 6.25069 13.194 4.87764 12.9209 3.55147C12.833 3.10355 12.6647 2.68428 12.4205 2.30537C12.2265 2.00459 11.8297 1.91084 11.5205 2.09313L10.6487 2.60876L9.64546 2.07751C9.45015 1.97464 9.21643 1.97464 9.02112 2.07751L7.99996 2.61852L6.9788 2.07751C6.78348 1.97464 6.54976 1.97464 6.35445 2.07751L5.3512 2.60876L4.47945 2.09313C4.17118 1.91019 3.77404 2.00394 3.57938 2.30537C3.33524 2.68428 3.16695 3.10355 3.08036 3.54561C2.53121 6.21553 2.53121 9.03779 3.08004 11.7071C3.3206 12.8835 4.08785 13.8275 5.08232 14.17C6.03576 14.4994 7.01721 14.6667 7.99996 14.6667C8.47017 14.6667 8.94454 14.6179 9.41585 14.5408C10.0546 15.0448 10.8354 15.3334 11.6666 15.3334C13.6884 15.3334 15.3333 13.6882 15.3333 11.6667C15.3333 10.2549 14.5311 8.99613 13.3077 8.39217ZM5.51721 12.9095C4.9661 12.7194 4.53284 12.1569 4.38635 11.4395C3.87333 8.94535 3.87333 6.30797 4.38765 3.80797C4.40034 3.74287 4.41597 3.67841 4.43388 3.61527L4.99377 3.94665C5.19332 4.06513 5.43974 4.07035 5.64546 3.96227L6.66662 3.42126L7.68778 3.96227C7.8831 4.06514 8.11682 4.06514 8.31213 3.96227L9.33329 3.42126L10.3544 3.96227C10.5599 4.07035 10.8066 4.06514 11.0061 3.94665L11.5657 3.61592C11.5843 3.68037 11.6002 3.74678 11.6136 3.81449C11.8701 5.05797 12 6.34118 12 7.62699C12 7.75589 11.9987 7.88545 11.9957 8.01435C11.8873 8.00459 11.7776 8.00003 11.6666 8.00003C10.7601 8.00003 9.93094 8.33255 9.29028 8.87963C9.31343 8.81192 9.33329 8.74226 9.33329 8.6667C9.33329 8.29821 9.03479 8.00003 8.66662 8.00003H5.99996C5.63179 8.00003 5.33329 8.29821 5.33329 8.6667C5.33329 9.03519 5.63179 9.33337 5.99996 9.33337H8.66662C8.74218 9.33337 8.81193 9.31355 8.87964 9.2904C8.33252 9.93111 7.99996 10.7602 7.99996 11.6667C7.99996 11.8029 8.00903 11.9381 8.02404 12.0723C8.02892 12.116 8.03776 12.1589 8.04418 12.2024C8.05761 12.2929 8.07242 12.383 8.09248 12.4719C8.10351 12.5207 8.11722 12.5685 8.1302 12.6167C8.15254 12.6999 8.17684 12.7821 8.20483 12.8633C8.22115 12.9105 8.23856 12.9569 8.25675 13.0033C8.2889 13.0855 8.32422 13.166 8.36214 13.2456C8.37414 13.2708 8.38289 13.2974 8.39546 13.3223C7.42509 13.3744 6.45926 13.2351 5.51721 12.9095ZM11.6666 14C11.0608 14 10.4912 13.7728 10.0569 13.3549C9.59045 12.9147 9.33329 12.3151 9.33329 11.6667C9.33329 10.3802 10.3802 9.33337 11.6666 9.33337C11.9287 9.33337 12.1764 9.37438 12.417 9.45967C13.3639 9.77347 14 10.6602 14 11.6667C14 12.9532 12.9531 14 11.6666 14Z" fill="black"/>
          <path d="M6.00016 7.33333H7.3081C7.67627 7.33333 7.97477 7.03515 7.97477 6.66667C7.97477 6.29818 7.67627 6 7.3081 6H6.00016C5.632 6 5.3335 6.29818 5.3335 6.66667C5.3335 7.03515 5.632 7.33333 6.00016 7.33333Z" fill="black"/>
        </svg>
      </span>
    );
  }
  if(kind==='view'){
    return (
      <span className={`${styles.miniIcon}`}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="18" height="18" rx="3" fill="#0BB2F4"/>
          <path d="M16.158 8.28375C16.386 8.60325 16.5 8.76375 16.5 9C16.5 9.237 16.386 9.39675 16.158 9.71625C15.1335 11.1533 12.5167 14.25 9 14.25C5.4825 14.25 2.8665 11.1525 1.842 9.71625C1.614 9.39675 1.5 9.23625 1.5 9C1.5 8.763 1.614 8.60325 1.842 8.28375C2.8665 6.84675 5.48325 3.75 9 3.75C12.5175 3.75 15.1335 6.8475 16.158 8.28375Z" stroke="#00252A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M11.25 9C11.25 8.40326 11.0129 7.83097 10.591 7.40901C10.169 6.98705 9.59674 6.75 9 6.75C8.40326 6.75 7.83097 6.98705 7.40901 7.40901C6.98705 7.83097 6.75 8.40326 6.75 9C6.75 9.59674 6.98705 10.169 7.40901 10.591C7.83097 11.0129 8.40326 11.25 9 11.25C9.59674 11.25 10.169 11.0129 10.591 10.591C11.0129 10.169 11.25 9.59674 11.25 9Z" stroke="#00252A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

      </span>
    );
  }
  return (
    <span className={`${styles.miniIcon}`}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="18" height="18" rx="3" fill="#F4510B"/>
        <path d="M5.25 15.75C4.8375 15.75 4.4845 15.6033 4.191 15.3097C3.8975 15.0162 3.7505 14.663 3.75 14.25V4.5C3.5375 4.5 3.3595 4.428 3.216 4.284C3.0725 4.14 3.0005 3.962 3 3.75C2.9995 3.538 3.0715 3.36 3.216 3.216C3.3605 3.072 3.5385 3 3.75 3H6.75C6.75 2.7875 6.822 2.6095 6.966 2.466C7.11 2.3225 7.288 2.2505 7.5 2.25H10.5C10.7125 2.25 10.8908 2.322 11.0348 2.466C11.1788 2.61 11.2505 2.788 11.25 3H14.25C14.4625 3 14.6408 3.072 14.7848 3.216C14.9288 3.36 15.0005 3.538 15 3.75C14.9995 3.962 14.9275 4.14025 14.784 4.28475C14.6405 4.42925 14.4625 4.501 14.25 4.5V14.25C14.25 14.6625 14.1033 15.0157 13.8098 15.3097C13.5163 15.6038 13.163 15.7505 12.75 15.75H5.25ZM12.75 4.5H5.25V14.25H12.75V4.5ZM7.5 12.75C7.7125 12.75 7.89075 12.678 8.03475 12.534C8.17875 12.39 8.2505 12.212 8.25 12V6.75C8.25 6.5375 8.178 6.3595 8.034 6.216C7.89 6.0725 7.712 6.0005 7.5 6C7.288 5.9995 7.11 6.0715 6.966 6.216C6.822 6.3605 6.75 6.5385 6.75 6.75V12C6.75 12.2125 6.822 12.3907 6.966 12.5347C7.11 12.6787 7.288 12.7505 7.5 12.75ZM10.5 12.75C10.7125 12.75 10.8908 12.678 11.0348 12.534C11.1788 12.39 11.2505 12.212 11.25 12V6.75C11.25 6.5375 11.178 6.3595 11.034 6.216C10.89 6.0725 10.712 6.0005 10.5 6C10.288 5.9995 10.11 6.0715 9.966 6.216C9.822 6.3605 9.75 6.5385 9.75 6.75V12C9.75 12.2125 9.822 12.3907 9.966 12.5347C10.11 12.6787 10.288 12.7505 10.5 12.75Z" fill="#00252A"/>
      </svg>

    </span>
  );
}

function CloseIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18" stroke="#111827" strokeWidth="2" strokeLinecap="round"/><path d="M6 6l12 12" stroke="#111827" strokeWidth="2" strokeLinecap="round"/></svg>
  );
}

function DownloadIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v10" stroke="#111827" strokeWidth="2" strokeLinecap="round"/><path d="m8 11 4 4 4-4" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 20h16" stroke="#111827" strokeWidth="2" strokeLinecap="round"/></svg>
  );
}

function PrintIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 8V4h10v4" stroke="#111827" strokeWidth="2"/><path d="M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="#111827" strokeWidth="2"/><path d="M7 14h10v6H7v-6Z" stroke="#111827" strokeWidth="2"/></svg>
  );
}
