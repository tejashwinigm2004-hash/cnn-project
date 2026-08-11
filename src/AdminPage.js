import { useState, useEffect, useCallback } from "react";
import API_URL from "./config";
import { useAuth } from "./context/AuthContext";
 
/* ─────────────────────────────────────────────
   ADMIN PAGE
───────────────────────────────────────────── */
export default function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState("analytics");
 
  return (
    <div style={{ paddingTop: 120, paddingBottom: 60, maxWidth: 1100, margin: "0 auto", padding: "120px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, marginBottom: 24, color: "#0b0b0b" }}>
        Admin Dashboard
      </h1>
 
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        {["analytics", "products", "orders", "users"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              textTransform: "capitalize",
              background: tab === t ? "#0b0b0b" : "rgba(11,11,11,0.08)",
              color: tab === t ? "#fff" : "#0b0b0b",
            }}
          >
            {t}
          </button>
        ))}
      </div>
 
      {tab === "analytics" && <AnalyticsTab token={token} />}
      {tab === "products" && <ProductsTab token={token} />}
      {tab === "orders" && <OrdersTab token={token} />}
      {tab === "users" && <UsersTab token={token} />}
    </div>
  );
}
 
/* ─────────────────────────────────────────────
   ANALYTICS TAB
───────────────────────────────────────────── */
function AnalyticsTab({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);
 
  if (loading) return <p>Loading analytics…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
 
  const cards = [
    { label: "Total Orders", value: data.totalOrders },
    { label: "Total Users", value: data.totalUsers },
    { label: "Total Products", value: data.totalProducts },
    { label: "Total Bookings", value: data.totalBookings },
    { label: "Total Revenue", value: `₹${data.totalRevenue.toLocaleString("en-IN")}` },
  ];
 
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, color: "rgba(11,11,11,0.5)", marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0b0b0b" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
 
/* ─────────────────────────────────────────────
   PRODUCTS TAB
───────────────────────────────────────────── */
function ProductsTab({ token }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", stock: "", image: "" });
  const [editingId, setEditingId] = useState(null);
 
  const loadProducts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/api/admin/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setProducts(await res.json());
    setLoading(false);
  }, [token]);
 
  useEffect(() => { loadProducts(); }, [loadProducts]);
 
  const resetForm = () => {
    setForm({ name: "", description: "", price: "", category: "", stock: "", image: "" });
    setEditingId(null);
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId
      ? `${API_URL}/api/admin/products/${editingId}`
      : `${API_URL}/api/admin/products`;
    const method = editingId ? "PATCH" : "POST";
 
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) }),
    });
    resetForm();
    loadProducts();
  };
 
  const handleEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || "", description: p.description || "", price: p.price || "",
      category: p.category || "", stock: p.stock || "", image: p.image || "",
    });
  };
 
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await fetch(`${API_URL}/api/admin/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadProducts();
  };
 
  const inputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)", fontSize: 14, width: "100%", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "rgba(11,11,11,0.55)", marginBottom: 4 };
  const fieldStyle = { display: "flex", flexDirection: "column" };
 
  return (
    <div>
      {editingId && (
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0b0b0b", marginBottom: 8 }}>
          Editing: {form.name || "product"}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24, background: "#fff", padding: 20, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Name</label>
          <input style={inputStyle} placeholder="e.g. White Butter" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Category</label>
          <input style={inputStyle} placeholder="e.g. Butter" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Price (₹)</label>
          <input style={inputStyle} placeholder="e.g. 350" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Stock</label>
          <input style={inputStyle} placeholder="e.g. 20" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Image URL</label>
          <input style={inputStyle} placeholder="https:// or data:image/..." value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <input style={inputStyle} placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button type="submit" style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#0b0b0b", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            {editingId ? "Update" : "Add"} Product
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", cursor: "pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </form>
 
      {loading ? <p>Loading products…</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((p) => (
            <div key={p._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: 14, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div>
                <strong>{p.name}</strong> — ₹{p.price} {p.category ? `· ${p.category}` : ""} {typeof p.stock === "number" ? `· stock: ${p.stock}` : ""}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleEdit(p)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", cursor: "pointer" }}>Edit</button>
                <button onClick={() => handleDelete(p._id)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#e63946", color: "#fff", cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
/* ─────────────────────────────────────────────
   ORDERS TAB
───────────────────────────────────────────── */
function OrdersTab({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
 
  const loadOrders = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setOrders(await res.json());
    setLoading(false);
  }, [token]);
 
  useEffect(() => { loadOrders(); }, [loadOrders]);
 
  const updateStatus = async (id, status) => {
    await fetch(`${API_URL}/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadOrders();
  };
 
  if (loading) return <p>Loading orders…</p>;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {orders.map((o) => (
        <div key={o._id} style={{ background: "#fff", padding: 14, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong>{o.userId?.name || "Unknown"}</strong> · {o.userId?.phone || "no phone"}
              <div style={{ fontSize: 13, color: "rgba(11,11,11,0.5)" }}>Total: ₹{o.totalAmount}</div>
            </div>
            <select
              value={o.status}
              onChange={(e) => updateStatus(o._id, e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)" }}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
 
/* ─────────────────────────────────────────────
   USERS TAB
───────────────────────────────────────────── */
function UsersTab({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(await res.json());
      setLoading(false);
    })();
  }, [token]);
 
  if (loading) return <p>Loading users…</p>;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {users.map((u) => (
        <div key={u._id} style={{ background: "#fff", padding: 14, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between" }}>
          <div>
            <strong>{u.name}</strong> — {u.email}
            {u.phone && <span> · {u.phone}</span>}
          </div>
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: u.role === "admin" ? "#0b0b0b" : "rgba(0,0,0,0.08)", color: u.role === "admin" ? "#fff" : "#0b0b0b" }}>
            {u.role}
          </span>
        </div>
      ))}
    </div>
  );
}