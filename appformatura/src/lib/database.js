import Dexie from 'dexie'

export const db = new Dexie('EntradaShowDB')
db.version(1).stores({
  projects: 'id, name, createdAt',
  entries: 'id, projectId, position, name, groupName'
})

export const DEFAULT_PROJECT_ID = 'local-project'

export async function ensureProject() {
  let project = await db.projects.get(DEFAULT_PROJECT_ID)
  if (!project) {
    project = { id: DEFAULT_PROJECT_ID, name: 'Minha formatura', createdAt: new Date().toISOString() }
    await db.projects.put(project)
  }
  return project
}

export function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
