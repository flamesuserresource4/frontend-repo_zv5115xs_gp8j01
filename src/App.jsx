import { useEffect, useMemo, useState } from 'react'

// Smart backend URL resolution to avoid "Failed to fetch"
const resolvedBackendUrl = (() => {
  const envUrl = import.meta.env.VITE_BACKEND_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    // Allow overriding via global for quick fixes
    // eslint-disable-next-line no-undef
    if (window.BACKEND_URL) return window.BACKEND_URL.replace(/\/$/, '')
    const { protocol, hostname, port, host } = window.location
    // Modal-style host often uses -3000 and -8000 subdomains
    if (host.includes('-3000')) {
      return `${protocol}//${host.replace('-3000', '-8000')}`
    }
    // If running locally on 3000, talk to 8000
    if (port === '3000') {
      return `${protocol}//${hostname}:8000`
    }
    // Fallback: same origin
    return `${protocol}//${host}`
  }
  return 'http://localhost:8000'
})()

const baseUrl = resolvedBackendUrl

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    let msg = 'Request failed'
    try {
      const data = await res.json()
      msg = data.detail || data.message || msg
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api(
        mode === 'login' ? '/auth/login' : '/auth/register',
        {
          method: 'POST',
          body: mode === 'login' ? { email, password } : { name, email, password },
        }
      )
      onAuth(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Student Management System</h1>
        <div className="flex justify-center mb-6 gap-2">
          <button
            className={`px-4 py-2 rounded ${mode==='login'?'bg-indigo-600 text-white':'bg-gray-100'}`}
            onClick={() => setMode('login')}
          >Login</button>
          <button
            className={`px-4 py-2 rounded ${mode==='register'?'bg-indigo-600 text-white':'bg-gray-100'}`}
            onClick={() => setMode('register')}
          >Register</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode==='register' && (
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full border rounded px-3 py-2" required />
          )}
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" required />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full border rounded px-3 py-2" required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 transition disabled:opacity-50">
            {loading ? 'Please wait...' : (mode==='login'?'Login':'Create account')}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-6">Backend: {baseUrl}</p>
      </div>
    </div>
  )
}

function Header({ user, onLogout, active, setActive }) {
  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'courses', label: 'Courses' },
    { key: 'my', label: 'My Courses' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'grades', label: 'Grades' },
    { key: 'announcements', label: 'Announcements' },
  ]
  return (
    <div className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="font-bold text-indigo-700">SMS</div>
        <nav className="flex gap-2 flex-1">
          {tabs.map(t => (
            <button key={t.key} onClick={()=>setActive(t.key)}
              className={`px-3 py-1.5 rounded ${active===t.key?'bg-indigo-600 text-white':'hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="text-sm text-gray-600">{user.name}</div>
        <button onClick={onLogout} className="ml-2 text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded">Logout</button>
      </div>
    </div>
  )
}

function Dashboard({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let mounted = true
    setLoading(true)
    api('/dashboard', { token })
      .then(d => { if(mounted) setData(d) })
      .catch(e => { if(mounted) setError(e.message) })
      .finally(() => { if(mounted) setLoading(false) })
    return () => { mounted = false }
  }, [token])
  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  return (
    <div className="p-6 grid gap-6 md:grid-cols-2">
      {data?.progress?.map((p) => (
        <div key={p.course._id} className="bg-white rounded-lg shadow p-4">
          <div className="font-semibold text-gray-800">{p.course.title} <span className="text-xs text-gray-500">({p.course.code})</span></div>
          <p className="text-sm text-gray-600 mt-1">{p.course.description}</p>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <div className="text-2xl font-bold">{p.attendance_records}</div>
              <div className="text-xs text-gray-500">Attendance Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.round(p.avg_grade)}</div>
              <div className="text-xs text-gray-500">Avg Grade</div>
            </div>
          </div>
        </div>
      ))}
      {(!data || data.progress.length===0) && (
        <div className="text-gray-600">No courses enrolled yet. Go to Courses to enroll.</div>
      )}
    </div>
  )
}

function Courses({ token, onEnrolled }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await api('/courses')
      if (list.length === 0) {
        // auto-seed demo data
        await api('/seed', { method: 'POST' })
        const seeded = await api('/courses')
        setCourses(seeded)
      } else {
        setCourses(list)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const enroll = async (courseId) => {
    try {
      await api('/enroll', { method: 'POST', token, body: { course_id: courseId } })
      onEnrolled && onEnrolled()
      alert('Enrolled successfully')
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  return (
    <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map(c => (
        <div key={c._id} className="bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="font-semibold text-gray-800">{c.title}</div>
          <div className="text-xs text-gray-500">{c.code} {c.instructor?`• ${c.instructor}`:''}</div>
          <p className="text-sm text-gray-600 mt-2 flex-1">{c.description}</p>
          <button onClick={()=>enroll(c._id)} className="mt-4 bg-indigo-600 text-white rounded px-3 py-2 hover:bg-indigo-700">Enroll</button>
        </div>
      ))}
      {courses.length===0 && <div className="text-gray-600">No courses available yet.</div>}
    </div>
  )
}

function MyCourses({ token, onPickCourse }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(()=>{
    setLoading(true)
    api('/my/courses', { token })
      .then(setCourses)
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[token])
  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  return (
    <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map(c => (
        <div key={c._id} className="bg-white rounded-lg shadow p-4">
          <div className="font-semibold text-gray-800">{c.title}</div>
          <div className="text-xs text-gray-500">{c.code}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={()=>onPickCourse(c)} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Select</button>
          </div>
        </div>
      ))}
      {courses.length===0 && <div className="text-gray-600">You haven't enrolled in any course yet.</div>}
    </div>
  )
}

function Attendance({ token, activeCourse }) {
  const [selected, setSelected] = useState(activeCourse)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ setSelected(activeCourse) },[activeCourse])

  const refresh = async (cid) => {
    if (!cid) return
    setLoading(true)
    try {
      const data = await api(`/attendance/${cid}`, { token })
      setRecords(data)
    } catch (e) {
      alert(e.message)
    } finally { setLoading(false) }
  }

  const mark = async (status='present') => {
    if (!selected) return
    try {
      await api('/attendance/mark', { method: 'POST', token, body: { course_id: selected._id, status } })
      await refresh(selected._id)
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="p-6">
      <CoursePicker token={token} selected={selected} setSelected={setSelected} onPicked={(c)=>refresh(c._id)} />
      <div className="mt-4 flex gap-2">
        <button onClick={()=>mark('present')} className="bg-green-600 text-white px-3 py-1 rounded">Mark Present</button>
        <button onClick={()=>mark('absent')} className="bg-red-600 text-white px-3 py-1 rounded">Mark Absent</button>
        <button onClick={()=>selected && refresh(selected._id)} className="bg-gray-200 px-3 py-1 rounded">Refresh</button>
      </div>
      <div className="mt-4 bg-white rounded shadow divide-y">
        {loading && <div className="p-3">Loading...</div>}
        {records.map(r => (
          <div key={r._id} className="p-3 flex justify-between">
            <div className="text-sm">{new Date(r.date).toLocaleString()}</div>
            <div className={`text-sm font-semibold ${r.status==='present'?'text-green-700':'text-red-700'}`}>{r.status}</div>
          </div>
        ))}
        {records.length===0 && !loading && <div className="p-3 text-gray-600">No attendance yet.</div>}
      </div>
    </div>
  )
}

function Grades({ token, activeCourse }) {
  const [selected, setSelected] = useState(activeCourse)
  const [items, setItems] = useState([])
  const [grade, setGrade] = useState('')
  const [label, setLabel] = useState('')

  useEffect(()=>{ setSelected(activeCourse) },[activeCourse])

  const refresh = async (cid) => {
    if (!cid) return
    const data = await api(`/grades/${cid}`, { token })
    setItems(data)
  }

  const add = async () => {
    if (!selected) return
    await api('/grades', { method: 'POST', token, body: { course_id: selected._id, grade: parseFloat(grade), label } })
    setGrade('')
    setLabel('')
    await refresh(selected._id)
  }

  return (
    <div className="p-6">
      <CoursePicker token={token} selected={selected} setSelected={setSelected} onPicked={(c)=>refresh(c._id)} />
      <div className="mt-4 flex gap-2">
        <input type="number" value={grade} onChange={e=>setGrade(e.target.value)} placeholder="Grade (0-100)" className="border rounded px-3 py-1" />
        <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Label (e.g., Midterm)" className="border rounded px-3 py-1" />
        <button onClick={add} className="bg-indigo-600 text-white px-3 py-1 rounded">Add</button>
        <button onClick={()=>selected && refresh(selected._id)} className="bg-gray-200 px-3 py-1 rounded">Refresh</button>
      </div>
      <div className="mt-4 bg-white rounded shadow divide-y">
        {items.map(g => (
          <div key={g._id} className="p-3 flex justify-between">
            <div className="text-sm">{g.label || 'Grade'}</div>
            <div className="font-semibold">{g.grade}</div>
          </div>
        ))}
        {items.length===0 && <div className="p-3 text-gray-600">No grades yet.</div>}
      </div>
    </div>
  )
}

function Announcements({ token, activeCourse }) {
  const [selected, setSelected] = useState(activeCourse)
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(()=>{ setSelected(activeCourse) },[activeCourse])

  const refresh = async (cid) => {
    if (!cid) return
    const data = await api(`/announcements/${cid}`, { token })
    setItems(data)
  }

  const add = async () => {
    if (!selected) return
    await api('/announcements', { method: 'POST', token, body: { course_id: selected._id, title, content } })
    setTitle(''); setContent('')
    await refresh(selected._id)
  }

  return (
    <div className="p-6">
      <CoursePicker token={token} selected={selected} setSelected={setSelected} onPicked={(c)=>refresh(c._id)} />
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="border rounded px-3 py-2" />
        <input value={content} onChange={e=>setContent(e.target.value)} placeholder="Content" className="border rounded px-3 py-2 md:col-span-2" />
        <div className="md:col-span-3 flex gap-2">
          <button onClick={add} className="bg-indigo-600 text-white px-3 py-2 rounded">Post</button>
          <button onClick={()=>selected && refresh(selected._id)} className="bg-gray-200 px-3 py-2 rounded">Refresh</button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map(a => (
          <div key={a._id} className="bg-white rounded shadow p-4">
            <div className="font-semibold">{a.title}</div>
            <div className="text-sm text-gray-600">{a.content}</div>
            <div className="text-xs text-gray-500 mt-1">{new Date(a.created_at).toLocaleString()}</div>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-600">No announcements yet.</div>}
      </div>
    </div>
  )
}

function CoursePicker({ token, selected, setSelected, onPicked }) {
  const [list, setList] = useState([])
  useEffect(()=>{ api('/my/courses', { token }).then(setList).catch(()=>{}) },[token])
  return (
    <div className="flex items-center gap-2">
      <select value={selected?._id||''} onChange={e=>{
        const c = list.find(x=>x._id===e.target.value)
        setSelected(c)
        onPicked && onPicked(c)
      }} className="border rounded px-3 py-2">
        <option value="">Select course</option>
        {list.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
      </select>
    </div>
  )
}

function Shell({ user, token, onLogout }) {
  const [active, setActive] = useState('dashboard')
  const [activeCourse, setActiveCourse] = useState(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50">
      <Header user={user} onLogout={onLogout} active={active} setActive={setActive} />
      <main className="max-w-6xl mx-auto">
        {active==='dashboard' && <Dashboard token={token} />}
        {active==='courses' && <Courses token={token} onEnrolled={()=>setActive('my')} />}
        {active==='my' && <MyCourses token={token} onPickCourse={(c)=>{ setActiveCourse(c); setActive('attendance') }} />}
        {active==='attendance' && <Attendance token={token} activeCourse={activeCourse} />}
        {active==='grades' && <Grades token={token} activeCourse={activeCourse} />}
        {active==='announcements' && <Announcements token={token} activeCourse={activeCourse} />}
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(() => {
    const s = localStorage.getItem('sms_session')
    return s ? JSON.parse(s) : null
  })

  const onAuth = (data) => {
    setSession(data)
    localStorage.setItem('sms_session', JSON.stringify(data))
  }
  const onLogout = () => {
    setSession(null)
    localStorage.removeItem('sms_session')
  }

  if (!session?.token) return <Auth onAuth={onAuth} />

  return <Shell user={session.user} token={session.token} onLogout={onLogout} />
}

export default App
