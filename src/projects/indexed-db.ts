import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import { emptySession, nextRecord, ProjectConflict, summarize } from './store'
import type { ProjectStore, ProjectSummary, SavedProject, Session } from './types'

type StoredAsset = { id: string; projectId: string; data: ArrayBuffer; type: string }
interface PlannerDatabase extends DBSchema {
  projects: { key: string; value: SavedProject }
  summaries: { key: string; value: ProjectSummary }
  assets: { key: [string, string]; value: StoredAsset; indexes: { 'by-project': string } }
  meta: { key: 'session'; value: Session }
}

export async function openProjectStore(): Promise<ProjectStore> {
  const db = await openDB<PlannerDatabase>('kafelkorz', 1, {
    upgrade(database) {
      database.createObjectStore('projects', { keyPath: 'project.id' })
      database.createObjectStore('summaries', { keyPath: 'id' })
      database.createObjectStore('assets', { keyPath: ['projectId', 'id'] }).createIndex('by-project', 'projectId')
      database.createObjectStore('meta')
    },
  })
  return {
    async initialize(example) {
      const tx = db.transaction(['meta', 'projects', 'summaries'], 'readwrite')
      const existing = await tx.objectStore('meta').get('session')
      if (existing?.initialized) {
        await tx.done
        return existing
      }
      const record = nextRecord(example, null)
      const session = { initialized: true, activeId: example.id }
      await Promise.all([
        tx.objectStore('projects').put(record), tx.objectStore('summaries').put(summarize(record)),
        tx.objectStore('meta').put(session, 'session'), tx.done,
      ])
      return session
    },
    async getSession() { return await db.get('meta', 'session') ?? emptySession },
    async setActive(id) {
      const tx = db.transaction(['projects', 'meta'], 'readwrite')
      const activeId = id && await tx.objectStore('projects').getKey(id) ? id : null
      await Promise.all([tx.objectStore('meta').put({ initialized: true, activeId }, 'session'), tx.done])
    },
    async list() { return (await db.getAll('summaries')).sort((a, b) => b.updatedAt - a.updatedAt) },
    async read(id) {
      const record = await db.get('projects', id)
      if (record && record.project.schema !== 1) throw new Error('Ten projekt wymaga nowszej wersji planera.')
      return record
    },
    async readAsset(projectId, id) {
      const file = await db.get('assets', [projectId, id])
      return file && new Blob([file.data], { type: file.type })
    },
    async save(project, expected, files = []) {
      const encoded = await Promise.all(files.map(async file => ({
        id: file.id, projectId: project.id, data: await file.data.arrayBuffer(), type: file.data.type,
      })))
      const tx = db.transaction(['projects', 'summaries', 'assets'], 'readwrite')
      const projects = tx.objectStore('projects')
      const current = await projects.get(project.id)
      let record: SavedProject
      try {
        record = nextRecord(project, expected, current)
      } catch (error) {
        await tx.done
        throw error
      }
      await Promise.all([
        projects.put(record), tx.objectStore('summaries').put(summarize(record)),
        ...encoded.map(file => tx.objectStore('assets').put(file)), tx.done,
      ])
      return record
    },
    async remove(id, expected) {
      const tx = db.transaction(['projects', 'summaries', 'assets', 'meta'], 'readwrite')
      const projects = tx.objectStore('projects')
      const current = await projects.get(id)
      if (current?.revision !== expected) {
        await tx.done
        throw new ProjectConflict()
      }
      const files = tx.objectStore('assets')
      const [keys, session] = await Promise.all([
        files.index('by-project').getAllKeys(id), tx.objectStore('meta').get('session'),
      ])
      const writes: Promise<unknown>[] = [
        projects.delete(id), tx.objectStore('summaries').delete(id), ...keys.map(key => files.delete(key)),
      ]
      if (session?.activeId === id) writes.push(tx.objectStore('meta').put({ ...session, activeId: null }, 'session'))
      await Promise.all([...writes, tx.done])
    },
  }
}
