/* ============================================================
   MochiMeychi — jembatan ke Supabase
   Dipakai bareng-bareng oleh: website (index base.html),
   dashboard editor (index (1).html), dan app 3D (mochi-3d.html).

   CARA PASANG:
   1. Isi SUPABASE_URL & SUPABASE_ANON_KEY di bawah (dari Supabase
      Dashboard -> Project Settings -> API). Anon key ini AMAN
      ditaruh di kode publik — yang membatasi aksesnya adalah RLS
      di supabase-schema.sql, bukan kerahasiaan key ini.
   2. Pasang di setiap file, SEBELUM script utama masing-masing:
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
        <script src="mm-supabase.js"></script>
   ============================================================ */
(function () {
  "use strict";

  var SUPABASE_URL = "https://lqkvperrzpeztnkgvxir.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_i2zC2Ai1Lns1iyg5CPn1ig_ht7tZaTz";

  var ready = !!(window.supabase && SUPABASE_URL.indexOf("ISI_DENGAN") !== 0 && SUPABASE_ANON_KEY.indexOf("ISI_DENGAN") !== 0);
  var client = ready ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  function warnOnce() {
    if (warnOnce._done) return; warnOnce._done = true;
    console.warn("[MM] Supabase belum diisi (SUPABASE_URL/SUPABASE_ANON_KEY di mm-supabase.js). " +
      "Website tetap jalan seperti biasa, tapi pesanan & produk belum tersambung ke database.");
  }

  var MM = {
    ready: ready,

    /* ---------- produk & pengaturan toko (dipakai website + app 3D, baca publik) ---------- */
    fetchProducts: function () {
      if (!ready) { warnOnce(); return Promise.resolve(null); }
      return client.from("products").select("*").order("sort_order", { ascending: true })
        .then(function (r) { return r.error ? null : r.data; });
    },
    fetchStoreSettings: function () {
      if (!ready) { warnOnce(); return Promise.resolve(null); }
      return client.from("store_settings").select("data").eq("id", 1).single()
        .then(function (r) { return r.error ? null : r.data.data; });
    },
    fetchBlockedDates: function () {
      if (!ready) { warnOnce(); return Promise.resolve(null); }
      return client.from("blocked_dates").select("the_date,status")
        .then(function (r) { return r.error ? null : r.data; });
    },

    /* ---------- produk: tulis (dashboard, admin saja lewat RLS) ---------- */
    upsertProduct: function (row) {
      if (!ready) { warnOnce(); return Promise.resolve({ ok: false, reason: "not-configured" }); }
      return client.from("products").upsert(row, { onConflict: "id" })
        .then(function (r) { return r.error ? { ok: false, reason: r.error.message } : { ok: true }; });
    },
    upsertProducts: function (rows) {
      if (!ready) { warnOnce(); return Promise.resolve({ ok: false, reason: "not-configured" }); }
      return client.from("products").upsert(rows, { onConflict: "id" })
        .then(function (r) { return r.error ? { ok: false, reason: r.error.message } : { ok: true }; });
    },
    updateProduct: function (id, patch) {
      if (!ready) { warnOnce(); return Promise.resolve({ ok: false, reason: "not-configured" }); }
      return client.from("products").update(patch).eq("id", id)
        .then(function (r) { return r.error ? { ok: false, reason: r.error.message } : { ok: true }; });
    },
    deleteProduct: function (id) {
      if (!ready) { warnOnce(); return Promise.resolve({ ok: false, reason: "not-configured" }); }
      return client.from("products").delete().eq("id", id)
        .then(function (r) { return r.error ? { ok: false, reason: r.error.message } : { ok: true }; });
    },

    /* ---------- pesanan (checkout website menulis, dashboard membaca) ---------- */
    createOrder: function (order) {
      // order: {customer_name, method, method_fee, address, order_date, notes, total, items, source}
      // CATATAN: sengaja TIDAK pakai .select() di sini. Pembeli (anon) cuma boleh
      // membuat pesanan, bukan membacanya balik (RLS: orders SELECT cuma buat admin).
      // Kalau pakai .select(), Supabase minta izin "lihat lagi baris yang baru dibuat"
      // dan itu ditolak, jadi seluruh penyimpanan ikut gagal walau datanya sebenarnya masuk.
      if (!ready) { warnOnce(); return Promise.resolve({ ok: false, reason: "not-configured" }); }
      return client.from("orders").insert(order)
        .then(function (r) { return r.error ? { ok: false, reason: r.error.message } : { ok: true }; })
        .catch(function (e) { return { ok: false, reason: String(e) }; });
    },

    /* ---------- login admin (dashboard) ---------- */
    signInWithGoogle: function (redirectTo) {
      if (!ready) { warnOnce(); return Promise.resolve(null); }
      return client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo || window.location.href } });
    },
    signOut: function () {
      if (!ready) return Promise.resolve(null);
      return client.auth.signOut();
    },
    getSession: function () {
      if (!ready) return Promise.resolve(null);
      return client.auth.getSession().then(function (r) { return r.data.session; });
    },
    onAuthChange: function (fn) {
      if (!ready) return function () {};
      var sub = client.auth.onAuthStateChange(function (_evt, session) { fn(session); });
      return function () { sub.data.subscription.unsubscribe(); };
    },
    /* true/false — dicek di server lewat RLS (is_admin()), ini cuma pencocokan tampilan */
    isLikelyAdmin: function (session) {
      return !!(session && session.user && session.user.email);
    },
    /* cek beneran ke server: apakah email yang lagi login ada di tabel admins */
    checkIsAdmin: function () {
      if (!ready) { warnOnce(); return Promise.resolve(false); }
      return client.rpc("is_admin").then(function (r) { return r.error ? false : !!r.data; });
    },

    client: function () { return client; }
  };

  window.MM = MM;
})();
