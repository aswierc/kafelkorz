import { expect, it } from 'vitest'
import { createMemoryProjectStore } from '../src/projects/store'
import type { Project } from '../src/projects/types'

const project = (id: string, name: string): Project => ({
  id, name, schema: 1, surfaces: [],
})

it('przywraca ostatni projekt i jego zdjęcie bez nadpisania drugiego projektu', async () => {
  const store = createMemoryProjectStore()
  await store.save(project('first', 'Pierwszy'), null)
  await store.save(project('second', 'Drugi'), null, [{ id: 'photo', data: new Blob(['stone']) }])
  await store.setActive('second')
  expect(await store.getSession()).toEqual({ initialized: true, activeId: 'second' })
  expect((await store.read('second'))?.project.name).toBe('Drugi')
  expect(await (await store.readAsset('second', 'photo'))?.text()).toBe('stone')
  expect((await store.read('first'))?.project.name).toBe('Pierwszy')
  expect(await store.readAsset('first', 'photo')).toBeUndefined()
})

it('zabezpiecza nowszy zapis przed nadpisaniem i usunięciem ze starej karty', async () => {
  const store = createMemoryProjectStore()
  const first = await store.save(project('first', 'Pierwszy'), null)
  const newer = await store.save(project('first', 'Nowa nazwa'), first.revision)
  await expect(store.save(project('first', 'Stara nazwa'), first.revision)).rejects.toThrow('innej karcie')
  await expect(store.remove('first', first.revision)).rejects.toThrow('innej karcie')
  expect((await store.read('first'))?.project.name).toBe('Nowa nazwa')
  await store.remove('first', newer.revision)
  expect(await store.read('first')).toBeUndefined()
  await expect(store.save(project('first', 'Stara nazwa'), newer.revision)).rejects.toThrow('innej karcie')
})
