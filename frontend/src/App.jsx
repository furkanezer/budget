import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9050' })

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api
        .get('/auth/me')
        .then(res => setProfile(res.data))
        .catch(() => setProfile(null))
        .finally(() => setInitializing(false))
    } else {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setProfile(null)
      setInitializing(false)
    }
  }, [token])

  const login = async (email, password) => {
    setError('')
    setLoading(true)
    try {
      const normalized = email.trim().toLowerCase()
      const data = new URLSearchParams({ username: normalized, password })
      const res = await api.post('/auth/token', data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      setToken(res.data.access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  const register = async (payload) => {
    setError('')
    setLoading(true)
    try {
      const normalizedEmail = payload.email.trim().toLowerCase()
      await api.post('/auth/register', { ...payload, email: normalizedEmail })
      await login(normalizedEmail, payload.password)
    } catch (err) {
      setError(err.response?.data?.detail || 'Kayıt işlemi başarısız')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => setToken(null)

  return { token, profile, login, register, logout, error, loading, setError, initializing }
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-dot" style={{ background: accent }} />
      <div className="stat-meta">
        <p className="eyebrow">{label}</p>
        <h3>{value}</h3>
        {sub && <p className="muted tiny">{sub}</p>}
      </div>
    </div>
  )
}

function TransactionForm({ onCreated }) {
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'Genel', note: '' })
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await onCreated({ ...form, amount: Number(form.amount), occurred_at: new Date().toISOString() })
    setForm({ ...form, amount: '', note: '' })
    setSubmitting(false)
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Yeni Kayıt</p>
          <h3>Gelir & Gider</h3>
        </div>
        <div className="segmented">
          <button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => setForm({ ...form, type: 'expense' })}>Gider</button>
          <button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => setForm({ ...form, type: 'income' })}>Gelir</button>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Tutar</span>
          <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        </label>
        <label className="field">
          <span>Kategori</span>
          <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
        </label>
      </div>
      <label className="field">
        <span>Not</span>
        <textarea rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Örn. kira, yemek, maaş..." />
      </label>
      <button className="primary" type="submit" disabled={submitting}>{submitting ? 'Kaydediliyor...' : 'Kaydet'}</button>
    </form>
  )
}

function InsightPanel({ analytics, transactions, onDelete }) {
  const balanceBadge = useMemo(() => {
    if (!analytics) return null
    const positive = analytics.balance >= 0
    return <span className={`pill ${positive ? 'success' : 'danger'}`}>{analytics.balance.toFixed(2)} ₺</span>
  }, [analytics])

  return (
    <div className="grid-2 gap">
      {analytics && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analitik</p>
              <h3>Finans Özeti</h3>
            </div>
            {balanceBadge}
          </div>
          <div className="stat-wrap">
            <StatCard label="Toplam Gelir" value={`${analytics.total_income.toFixed(2)} ₺`} accent="#22c55e" />
            <StatCard label="Toplam Gider" value={`${analytics.total_expense.toFixed(2)} ₺`} accent="#ef4444" />
            <StatCard label="Tasarruf Oranı" value={`${(analytics.savings_rate * 100).toFixed(1)}%`} accent="#6366f1" />
          </div>
          <div className="suggest-box">
            <div className="panel-header minimal">
              <h4>Öneriler</h4>
              <span className="pill subtle">Akıllı ipuçları</span>
            </div>
            <ul className="suggest-list">
              {analytics.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Hareketler</p>
            <h3>Son İşlemler</h3>
          </div>
          <span className="pill subtle">{transactions.length} kayıt</span>
        </div>
        <div className="timeline">
          {transactions.map(tx => (
            <div key={tx.id} className="timeline-item">
              <div className={`dot ${tx.type === 'income' ? 'success' : 'danger'}`} />
              <div className="timeline-meta">
                <div className="row">
                  <strong>{tx.category}</strong>
                  <span className={`badge ${tx.type === 'income' ? 'success' : 'danger'}`}>{tx.type === 'income' ? 'Gelir' : 'Gider'}</span>
                </div>
                <p className="muted tiny">{new Date(tx.occurred_at).toLocaleDateString('tr-TR')}</p>
                {tx.note && <p className="note">{tx.note}</p>}
              </div>
              <div className="timeline-actions">
                <span className="mono">{tx.amount.toFixed(2)} ₺</span>
                <button className="ghost" onClick={() => onDelete(tx.id)}>Sil</button>
              </div>
            </div>
          ))}
          {!transactions.length && <p className="muted">Henüz kayıt yok. İlk işlemi ekleyin.</p>}
        </div>
      </div>
    </div>
  )
}

function AdminPanel() {
  const [overview, setOverview] = useState(null)
  useEffect(() => {
    api.get('/admin/overview').then(res => setOverview(res.data)).catch(() => setOverview(null))
  }, [])

  if (!overview) return null

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h3>Yönetim Özeti</h3>
        </div>
        <span className="pill accent">Güncel</span>
      </div>
      <div className="stat-wrap compact">
        <StatCard label="Kullanıcı" value={overview.user_count} accent="#a855f7" />
        <StatCard label="Toplam Gelir" value={`${overview.total_income.toFixed(2)} ₺`} accent="#22c55e" />
        <StatCard label="Toplam Gider" value={`${overview.total_expense.toFixed(2)} ₺`} accent="#ef4444" />
      </div>
      <div className="admin-list">
        <div className="row-space">
          <h4>Son İşlemler</h4>
          <span className="pill subtle">{overview.recent_transactions.length} kayıt</span>
        </div>
        <ul>
          {overview.recent_transactions.map((tx, idx) => (
            <li key={idx}>
              <div>
                <strong>{tx.user}</strong>
                <p className="muted tiny">{tx.category} · {tx.type}</p>
              </div>
              <span className="mono">{tx.amount} ₺</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Dashboard({ profile }) {
  const [transactions, setTransactions] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [txRes, anaRes] = await Promise.all([
        api.get('/transactions/'),
        api.get('/transactions/analytics')
      ])
      setTransactions(txRes.data)
      setAnalytics(anaRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createTransaction = async (payload) => {
    await api.post('/transactions/', payload)
    await load()
  }

  const deleteTx = async (id) => {
    await api.delete(`/transactions/${id}`)
    await load()
  }

  const heroBadge = useMemo(() => (
    <div className="hero-metrics">
      <div>
        <p className="eyebrow">Bakiye</p>
        <h1>{analytics ? `${analytics.balance.toFixed(2)} ₺` : '---'}</h1>
      </div>
      <div className="hero-subgrid">
        <div>
          <p className="muted tiny">Gelir</p>
          <strong>{analytics ? `${analytics.total_income.toFixed(2)} ₺` : '---'}</strong>
        </div>
        <div>
          <p className="muted tiny">Gider</p>
          <strong>{analytics ? `${analytics.total_expense.toFixed(2)} ₺` : '---'}</strong>
        </div>
      </div>
    </div>
  ), [analytics])

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Merhaba, {profile.full_name}</p>
          <h2>Modern finans paneli</h2>
          <p className="muted">Gerçek zamanlı gelir-gider takibi, akıllı öneriler ve admin kontrolü tek ekranda.</p>
          <div className="chip-row">
            <span className="chip">Gerçek zamanlı analiz</span>
            <span className="chip">Otomatik öneriler</span>
            <span className="chip">Admin yetkisi</span>
          </div>
        </div>
        {heroBadge}
      </header>

      {loading && <div className="alert">Veriler yükleniyor...</div>}

      <div className="grid-2 gap">
        <TransactionForm onCreated={createTransaction} />
        <div className="panel gradient">
          <p className="eyebrow">Kontrol Merkezi</p>
          <h3>Hedeflerinize odaklanın</h3>
          <p className="muted">Kişisel finans akışınızı kartlar, rozetler ve sade bir zaman çizelgesiyle takip edin.</p>
          <div className="quick-actions">
            <div>
              <span className="pill success">Güvenli</span>
              <p className="muted tiny">JWT ile korunan API</p>
            </div>
            <div>
              <span className="pill accent">Docker</span>
              <p className="muted tiny">Compose ile hızlı kurulum</p>
            </div>
          </div>
        </div>
      </div>

      <InsightPanel analytics={analytics} transactions={transactions} onDelete={deleteTx} />

      {profile.is_admin && <AdminPanel />}
    </div>
  )
}

function AuthPanel({ onLogin, onRegister, error, loading, setError }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (tab === 'login') await onLogin(form.email, form.password)
    else await onRegister({ email: form.email, password: form.password, full_name: form.full_name })
  }

  return (
    <div className="auth-layout">
      <div className="auth-hero">
        <div className="glow" />
        <p className="eyebrow">Bütçe 2.0</p>
        <h1>Dijital bütçe koçunuz</h1>
        <p className="muted">Modern arayüz, akıllı öneriler, otomatik admin hesabı ve güvenli oturumlarla finansınızı yönetin.</p>
        <div className="chip-row">
          <span className="chip">Analitik</span>
          <span className="chip">Admin paneli</span>
          <span className="chip">JWT</span>
        </div>
      </div>
      <div className="auth-card panel">
        <div className="tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError('') }}>Giriş</button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError('') }}>Kayıt</button>
        </div>
        {error && <div className="alert danger">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          {tab === 'register' && (
            <label className="field">
              <span>Ad Soyad</span>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
            </label>
          )}
          <label className="field">
            <span>E-posta</span>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="field">
            <span>Parola</span>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button className="primary" type="submit" disabled={loading}>{loading ? 'İşlem yapılıyor...' : tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
          <p className="muted tiny">Varsayılan admin: admin@example.com / admin1234</p>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const auth = useAuth()

  if (auth.initializing) {
    return <div className="loading-screen">Yükleniyor...</div>
  }

  if (!auth.token) {
    return <AuthPanel onLogin={auth.login} onRegister={auth.register} error={auth.error} loading={auth.loading} setError={auth.setError} />
  }

  return (
    <div className="app-shell">
      <aside className="nav">
        <div className="brand">Budget</div>
        <p className="muted">Gerçek zamanlı gelir-gider takibi, admin denetimi ve modern arayüz.</p>
        <div className="profile">
          <div>
            <p className="eyebrow">Profil</p>
            <strong>{auth.profile?.full_name}</strong>
            <p className="muted tiny">{auth.profile?.email}</p>
          </div>
          {auth.profile?.is_admin && <span className="pill success">Admin</span>}
        </div>
        <button className="ghost" onClick={auth.logout}>Çıkış</button>
      </aside>
      <main>
        {auth.profile ? <Dashboard profile={auth.profile} /> : <div className="loading-screen">Profil yükleniyor...</div>}
      </main>
    </div>
  )
}
