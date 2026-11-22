import type { Surface } from '../layout/types'

export type Project = { id: string; name: string; schema: 1; surfaces: Surface[] }
export type SavedProject = { project: Project; revision: number; updatedAt: number }
export type ProjectSummary = { id: string; name: string; surfaces: number; updatedAt: number }
export type ProjectAsset = { id: string; data: Blob }
export type Session = { initialized: boolean; activeId: string | null }

export interface ProjectStore {
  initialize(example: Project): Promise<Session>
  getSession(): Promise<Session>
  setActive(id: string | null): Promise<void>
  list(): Promise<ProjectSummary[]>
  read(id: string): Promise<SavedProject | undefined>
  readAsset(projectId: string, assetId: string): Promise<Blob | undefined>
  save(project: Project, expectedRevision: number | null, assets?: ProjectAsset[]): Promise<SavedProject>
  remove(id: string, expectedRevision: number): Promise<void>
}
