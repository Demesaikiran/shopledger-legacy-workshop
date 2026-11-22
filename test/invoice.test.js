const assert = require('node:assert/strict');
const test = require('node:test');

const invoice = require('../lib/invoice');
const orders = require('../lib/orders');
const pricing = require('../lib/pricing');

test('invoice uses the same HSN GST slab and total as order billing', () => {
  const items = [
    { id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 2 }
  ];
  const billed = pricing.computeTotals(items, '');
  const db = { nextOrderId: 1001, orders: [] };
  const order = orders.add(db, {
    items,
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  });
  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(billed.tax, 10);
  assert.equal(billed.total, 210);
  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.tax, billed.tax);
  assert.equal(figures.cgst, billed.cgst);
  assert.equal(figures.sgst, billed.sgst);
  assert.equal(figures.total, billed.total);
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
});

test('invoice applies the same coupon allocation and GST as order billing', () => {
  const items = [
    { id: 2, name: 'Rice', hsn: '1006', price: 100, qty: 1 }
  ];
  const billed = pricing.computeTotals(items, 'WELCOME');
  const order = {
    id: 1002,
    items,
    coupon: 'WELCOME',
    subtotal: billed.subtotal,
    discount: billed.discount,
    tax: billed.tax,
    total: billed.total
  };
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, total: billed.total },
    { subtotal: 100, discount: 5, tax: 4.75, total: 99.75 }
  );
  assert.deepEqual(
    { subtotal: figures.subtotal, discount: figures.discount, tax: figures.tax, total: figures.total },
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, total: billed.total }
  );
});

test('invoice treats fractional gstRate the same way as order billing', () => {
  const items = [
    { id: 3, name: 'Tea', hsn: '0902', gstRate: 0.05, price: 100, qty: 1 }
  ];
  const billed = pricing.computeTotals(items, '');
  const order = { id: 1003, items, total: billed.total };
  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(billed.lines[0].gstPercent, 5);
  assert.equal(billed.tax, 5);
  assert.equal(billed.total, 105);
  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.tax, billed.tax);
  assert.equal(figures.total, billed.total);
});
