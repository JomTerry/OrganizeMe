/* style.css — OrganizeMe (always-vertical layout) */

:root{
  --bg: #f5f7fb;
  --card: #ffffff;
  --accent: #0b63d6;
  --accent-2: #2a9df4;
  --muted: #6b7280;
  --shadow: 0 6px 18px rgba(16,24,40,.06);
  --radius: 12px;
  --max-width: 980px;
  --gutter: 16px;
  --text: #0f172a;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--bg);-webkit-font-smoothing:antialiased;color:var(--text)}
.wrap{max-width:var(--max-width);margin:18px auto;padding:0 16px}

/* Header */
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(90deg,var(--accent),var(--accent-2));padding:14px 18px;border-radius:12px;color:#fff}
.site-title{margin:0;font-size:20px;line-height:1}
.site-sub{opacity:.95;font-size:13px;color:rgba(255,255,255,.95)}
.auth-area{display:flex;gap:8px;align-items:center}
.meta{font-size:13px;color:var(--muted)}

/* Card */
.card{background:var(--card);border-radius:var(--radius);padding:14px;box-shadow:var(--shadow);margin-bottom:var(--gutter)}
.small-note{font-size:13px;color:var(--muted);margin-top:6px}

/* Layout — vertical */
.main-grid{display:grid;grid-template-columns:1fr;gap:16px;padding:0 16px}
.form-grid{display:grid;grid-template-columns:1fr;gap:10px;align-items:stretch}
.row-row{display:flex;gap:10px;flex-wrap:wrap}
.date-time{min-width:140px;flex:0 0 140px}

/* Inputs */
input,textarea,select{padding:8px;border-radius:8px;border:1px solid #e6e9ee;font:inherit;outline:none;width:100%}
textarea{min-height:64px;resize:vertical}

/* Buttons */
button{font:inherit;border:0;padding:8px 12px;border-radius:8px;cursor:pointer;background:var(--accent);color:#fff;min-height:40px}
button.ghost{background:transparent;color:var(--muted);border:1px solid #e6e9ee}

/* Google button */
.google-btn{
  display:flex;align-items:center;gap:8px;background:#fff;color:#444;font-weight:500;border:1px solid #ddd;border-radius:6px;padding:8px 12px;cursor:pointer;
}
.google-btn img{width:18px;height:18px}
.google-btn:hover{background:#f7f7f7;box-shadow:0 2px 6px rgba(0,0,0,0.05)}

/* Task list */
.task-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
li.task{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px;border-radius:8px;background:#fafafa;border:1px solid #f0f3f7}
.meta{font-size:13px;color:var(--muted)}
.soon{color:#b91c1c;font-weight:600}

/* Priority badges */
.badge{padding:4px 8px;border-radius:999px;font-weight:600;font-size:12px}
.badge.high{background:#ffe9e9;color:#9b1c1c}   /* red */
.badge.med{background:#fff7e6;color:#8a5700}    /* yellow/orange */
.badge.low{background:#e9f7ee;color:#05603a}    /* green */

/* Modal */
.modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,0.45);z-index:50;padding:20px}
.modal .modal-inner{width:100%;max-width:420px}
.modal .modal-inner.card{position:relative;padding:18px}
.modal .modal-close{position:absolute;right:10px;top:10px;border-radius:6px;padding:6px}

/* Mobile fine tuning */
@media (max-width:420px){
  .wrap{margin:12px auto;padding:0 12px}
  header .wrap{padding:12px}
  button{padding:10px}
}