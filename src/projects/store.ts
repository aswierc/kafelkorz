import type { Project, ProjectStore, SavedProject, Session } from './types'

export const emptySession: Session = { initialized: false, activeId: null }

export class ProjectConflict extends Error {
  constructor() {
    super('Projekt zmienił się w innej karcie. Otwórz nowszą wersję z listy projektów.')
    this.name = 'ProjectConflict'
  }
}

export function nextRecord(project: Project, expected: number | null, existing?: SavedProject): SavedProject {
  if ((existing?.revision ?? null) !== expected) throw new ProjectConflict()
  return { project, revision: (expected ?? 0) + 1, updatedAt: Date.now() }
}

export function summarize({ project, updatedAt }: SavedProject) {
  return { id: project.id, name: project.name, surfaces: project.surfaces.length, updatedAt }
}

export function createMemoryProjectStore(): ProjectStore {
  const projects = new Map<string, SavedProject>()
  const assets = new Map<string, Map<string, Blob>>()
  let session = { ...emptySession }

  return {
    async initialize(example) {
      if (!session.initialized) {
        projects.set(example.id, nextRecord(example, null))
        session = { initialized: true, activeId: example.id }
      }
      return { ...session }
    },
    async getSession() { return { ...session } },
    async setActive(id) {
      session = { initialized: true, activeId: id && projects.has(id) ? id : null }
    },
    async list() { return [...projects.values()].map(summarize).sort((a, b) => b.updatedAt - a.updatedAt) },
    async read(id) { return structuredClone(projects.get(id)) },
    async readAsset(projectId, assetId) { return assets.get(projectId)?.get(assetId) },
    async save(project, expected, files = []) {
      const record = nextRecord(structuredClone(project), expected, projects.get(project.id))
      const textures = assets.get(project.id) ?? new Map<string, Blob>()
      files.forEach(file => textures.set(file.id, file.data))
      assets.set(project.id, textures)
      projects.set(project.id, record)
      return structuredClone(record)
    },
    async remove(id, expected) {
      if (projects.get(id)?.revision !== expected) throw new ProjectConflict()
      projects.delete(id)
      assets.delete(id)
      if (session.activeId === id) session = { ...session, activeId: null }
    },
  }
}
