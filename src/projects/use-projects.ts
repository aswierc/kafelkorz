import { useCallback, useEffect, useRef, useState } from 'react'
import { createProject } from './examples'
import type { Example } from './examples'
import type { Project, ProjectAsset, ProjectStore, ProjectSummary, SavedProject } from './types'

const message = (error: unknown) => error instanceof Error ? error.message : 'Nie udało się zapisać projektu.'

export function useProjects(openStore: () => Promise<ProjectStore>) {
  const [project, setProject] = useState<Project | null>(null)
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [introProject, setIntroProject] = useState<string>()
  const store = useRef<ProjectStore | null>(null)
  const revision = useRef<number | null>(null)
  const current = useRef<Project | null>(null)
  const lastSaved = useRef<Project | null>(null)
  const pendingFiles = useRef(new Map<string, ProjectAsset>())
  const queue = useRef<Promise<void>>(Promise.resolve())
  const switching = useRef(false)
  const saveError = useRef('')

  function show(record: SavedProject | null) {
    saveError.current = ''
    current.current = record?.project ?? null
    lastSaved.current = current.current
    revision.current = record?.revision ?? null
    pendingFiles.current.clear()
    setProject(current.current)
  }

  useEffect(() => {
    let mounted = true
    async function initialize() {
      try {
        const adapter = await openStore()
        const previous = await adapter.getSession()
        const example = createProject('wall')
        const session = await adapter.initialize(example)
        const active = session.activeId ? await adapter.read(session.activeId) : undefined
        const projects = await adapter.list()
        if (!mounted) return
        store.current = adapter
        show(active ?? null)
        if (!previous.initialized && active?.project.id === example.id) setIntroProject(example.id)
        setSummaries(projects)
        setStatus('saved')
      } catch (failure) {
        if (!mounted) return
        setError(message(failure))
        setStatus('error')
      }
    }
    void initialize()
    return () => { mounted = false }
  }, [openStore])

  function scheduleSave() {
    setStatus('saving')
    setError('')
    const adapter = store.current
    queue.current = queue.current.then(async () => {
      const snapshot = current.current
      if (!snapshot || !adapter || snapshot === lastSaved.current) return
      const files = Array.from(pendingFiles.current.values())
      try {
        const record = await adapter.save(snapshot, revision.current, files)
        revision.current = record.revision
        lastSaved.current = snapshot
        saveError.current = ''
        files.forEach(file => pendingFiles.current.delete(file.id))
        if (current.current === snapshot) {
          setStatus('saved')
          setError('')
        }
      } catch (failure) {
        saveError.current = message(failure)
        setStatus('error')
        setError(saveError.current)
      }
    })
    return queue.current
  }

  function edit(next: Project, file?: ProjectAsset) {
    if (switching.current || current.current?.id !== next.id) return
    if (file) pendingFiles.current.set(file.id, file)
    current.current = next
    setProject(next)
    void scheduleSave()
  }

  async function withStore(action: (adapter: ProjectStore) => Promise<void>) {
    if (!store.current || switching.current) return false
    switching.current = true
    setBusy(true)
    try {
      await queue.current
      await action(store.current)
      setSummaries(await store.current.list())
      if (!saveError.current) {
        setError('')
        setStatus('saved')
      }
      return true
    } catch (failure) {
      setError(message(failure))
      setStatus('error')
      return false
    } finally {
      switching.current = false
      setBusy(false)
    }
  }

  async function open(id: string, discardLocal = false) {
    return withStore(async adapter => {
      if (saveError.current && !discardLocal) throw new Error(saveError.current)
      const record = await adapter.read(id)
      if (!record) throw new Error('Wybrany projekt został usunięty.')
      await adapter.setActive(id)
      show(record)
      setStatus('saved')
      setError('')
    })
  }

  async function add(example?: Example, name?: string) {
    return withStore(async adapter => {
      if (saveError.current) throw new Error(saveError.current)
      const next = createProject(example)
      if (name?.trim()) next.name = name.trim()
      const record = await adapter.save(next, null)
      await adapter.setActive(next.id)
      show(record)
      setStatus('saved')
      setError('')
    })
  }

  async function rename(id: string, name: string) {
    if (!name.trim()) return false
    return withStore(async adapter => {
      if (current.current?.id === id && saveError.current) throw new Error(saveError.current)
      const record = await adapter.read(id)
      if (!record) throw new Error('Wybrany projekt został usunięty.')
      const saved = await adapter.save({ ...record.project, name: name.trim() }, record.revision)
      if (current.current?.id === id) show(saved)
    })
  }

  async function remove(id: string) {
    return withStore(async adapter => {
      const record = await adapter.read(id)
      if (!record) throw new Error('Wybrany projekt został już usunięty.')
      const expected = current.current?.id === id ? revision.current : record.revision
      if (expected === null) throw new Error('Projekt nie został jeszcze zapisany.')
      await adapter.remove(id, expected)
      if (current.current?.id === id) {
        show(null)
        setStatus('saved')
        setError('')
      }
    })
  }

  async function list() {
    if (!store.current) return
    await queue.current
    try {
      setSummaries(await store.current.list())
    } catch (failure) {
      setError(message(failure))
      setStatus('error')
    }
  }

  const readAsset = useCallback(async (projectId: string, assetId: string) => {
    if (current.current?.id === projectId && pendingFiles.current.has(assetId)) return pendingFiles.current.get(assetId)?.data
    return store.current?.readAsset(projectId, assetId)
  }, [])

  return { project, summaries, status, error, busy, introProject, edit, open, add, remove, rename, list, readAsset, retry: scheduleSave, hasUnsavedChanges: Boolean(saveError.current) }
}
