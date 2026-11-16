// LOCAL TEST TOOL ONLY: a tiny stand-in for the Razorpay REST API + Checkout script, bound to 127.0.0.1.
// It lets the real app code run end-to-end without a Razorpay account. Never used in production.
import http from "node:http";
import { createHmac } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const orders = new Map();
const payments = new Map();
const refunds = new Map();
let n = 0;
const id = (p) => `${p}_MOCK${String(++n).padStart(8, "0")}`;

const CHECKOUT_JS = `
window.Razorpay = function (o) { this.o = o; this.h = {}; };
window.Razorpay.prototype.on = function (e, f) { this.h[e] = f; };
window.Razorpay.prototype.open = function () {
  var o = this.o, self = this;
  var d = document.createElement('div');
  d.id = 'mock-rzp'; d.setAttribute('role','dialog');
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:grid;place-items:center';
  d.innerHTML = '<div style="background:#fff;padding:24px;border-radius:8px;min-width:280px;font-family:sans-serif"><h3>Mock Razorpay</h3><p>Order ' + o.order_id + '</p><p>Amount: ' + o.amount + ' paise</p>' +
    '<button id="mock-pay-ok">Pay success</button> <button id="mock-pay-fail">Pay fail</button> <button id="mock-pay-bad-sig">Success (bad signature)</button> <button id="mock-dismiss">Close</button></div>';
  document.body.appendChild(d);
  function post(path, body) { return fetch('${"http://127.0.0.1:" + PORT}' + path, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) }).then(function(r){return r.json();}); }
  document.getElementById('mock-pay-ok').onclick = function () { post('/_mock/pay', { order_id: o.order_id, status: 'captured' }).then(function (p) { d.remove(); o.handler({ razorpay_payment_id: p.id, razorpay_order_id: o.order_id, razorpay_signature: p.signature }); }); };
  document.getElementById('mock-pay-bad-sig').onclick = function () { post('/_mock/pay', { order_id: o.order_id, status: 'captured' }).then(function (p) { d.remove(); o.handler({ razorpay_payment_id: p.id, razorpay_order_id: o.order_id, razorpay_signature: '0'.repeat(64) }); }); };
  document.getElementById('mock-pay-fail').onclick = function () { post('/_mock/pay', { order_id: o.order_id, status: 'failed' }).then(function () { d.remove(); if (self.h['payment.failed']) self.h['payment.failed']({ error: { description: 'Payment failed (mock)' } }); if (o.modal && o.modal.ondismiss) o.modal.ondismiss(); }); };
  document.getElementById('mock-dismiss').onclick = function () { d.remove(); if (o.modal && o.modal.ondismiss) o.modal.ondismiss(); };
};`;

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type, "access-control-allow-origin": "*", "access-control-allow-headers": "*" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "");
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://x");
    const body = raw ? JSON.parse(raw) : {};
    const path = url.pathname.replace(/^\/v1/, "");
    let m;
    if (path === "/checkout.js") return send(res, 200, CHECKOUT_JS, "application/javascript");
    if (req.method === "POST" && path === "/orders") {
      const o = { id: id("order"), amount: body.amount, currency: body.currency, receipt: body.receipt, status: "created" };
      orders.set(o.id, o);
      return send(res, 200, o);
    }
    if (req.method === "POST" && path === "/_mock/pay") {
      const o = orders.get(body.order_id);
      const p = { id: id("pay"), order_id: o.id, amount: o.amount, currency: "INR", status: body.status, method: "upi", ...(body.status === "failed" ? { error_code: "BAD_REQUEST_ERROR", error_description: "Payment failed (mock)" } : {}) };
      payments.set(p.id, p);
      return send(res, 200, { id: p.id, signature: createHmac("sha256", KEY_SECRET).update(`${o.id}|${p.id}`).digest("hex") });
    }
    if ((m = path.match(/^\/payments\/(\w+)$/)) && req.method === "GET") return payments.has(m[1]) ? send(res, 200, payments.get(m[1])) : send(res, 400, { error: { code: "BAD_REQUEST_ERROR" } });
    if ((m = path.match(/^\/payments\/(\w+)\/refund$/))) { const r = { id: id("rfnd"), payment_id: m[1], amount: body.amount, status: "pending" }; refunds.set(r.id, r); return send(res, 200, r); }
    if ((m = path.match(/^\/refunds\/(\w+)$/))) return send(res, 200, refunds.get(m[1]));
    if ((m = path.match(/^\/orders\/(\w+)\/payments$/))) return send(res, 200, { items: [...payments.values()].filter((p) => p.order_id === m[1]) });
    if (path === "/_mock/state") return send(res, 200, { orders: [...orders.values()], payments: [...payments.values()], refunds: [...refunds.values()] });
    if ((m = path.match(/^\/_mock\/refund-processed\/(\w+)$/))) { refunds.get(m[1]).status = "processed"; return send(res, 200, refunds.get(m[1])); }
    send(res, 404, {});
  });
}).listen(PORT, "127.0.0.1", () => console.log(`mock razorpay on http://127.0.0.1:${PORT}`));
