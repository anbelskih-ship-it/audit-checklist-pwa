import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeFirestoreFields } from './firestore-rest-values.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const backupDir = '/Users/anbelskih/Desktop/Work/Приложение для аудита'
const projectId = 'audit-checklist-4d6ec'
const databaseId = '(default)'
const collections = ['allowedUsers', 'audits', 'config']

async function main() {
  const startedAt = new Date().toISOString()
  const token = getAccessToken()

  await rm(backupDir, { recursive: true, force: true })
  await mkdir(backupDir, { recursive: true })

  await archiveSource()
  await copyProjectFiles()

  const firestore = {}
  for (const collectionId of collections) {
    firestore[collectionId] = await fetchCollection(collectionId, token)
  }

  await writeJson('firestore-data.json', {
    metadata: {
      projectId,
      databaseId,
      exportedAt: startedAt,
      collections,
    },
    collections: firestore,
  })

  await writeJson('backup-manifest.json', {
    project: 'audit-checklist-pwa',
    projectId,
    backupType: 'latest-overwrite',
    createdAt: startedAt,
    sourcePath: projectRoot,
    backupPath: backupDir,
    files: [
      'source.tar.gz',
      'firestore-data.json',
      'backup-manifest.json',
      'firestore.rules',
      'firebase.json',
      '.firebaserc',
      'restore.md',
    ],
  })

  await writeRestoreGuide(startedAt)
  console.log(`Backup saved to: ${backupDir}`)
}

function getAccessToken() {
  const result = spawnSync('gcloud', ['auth', 'print-access-token', '--quiet'], {
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    throw new Error(
      `Cannot get Google access token via gcloud.\n${result.stderr || result.stdout}`.trim()
    )
  }

  return result.stdout.trim()
}

async function archiveSource() {
  const result = spawnSync('tar', [
    '-czf',
    path.join(backupDir, 'source.tar.gz'),
    '--exclude=.git',
    '--exclude=node_modules',
    '--exclude=dist',
    '--exclude=.superpowers',
    '--exclude=firebase-debug.log',
    '-C',
    projectRoot,
    '.',
  ], {
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    throw new Error(`Cannot archive source.\n${result.stderr || result.stdout}`.trim())
  }
}

async function copyProjectFiles() {
  for (const fileName of ['firestore.rules', 'firebase.json', '.firebaserc']) {
    await cp(path.join(projectRoot, fileName), path.join(backupDir, fileName))
  }
}

async function fetchCollection(collectionId, token) {
  const docs = []
  let pageToken = ''

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionId}`
    )
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw new Error(
        `Cannot export ${collectionId}: ${response.status} ${await response.text()}`
      )
    }

    const payload = await response.json()
    for (const document of payload.documents || []) {
      docs.push({
        id: document.name.split('/').pop(),
        name: document.name,
        createTime: document.createTime,
        updateTime: document.updateTime,
        fields: document.fields || {},
        data: decodeFirestoreFields(document.fields || {}),
      })
    }
    pageToken = payload.nextPageToken || ''
  } while (pageToken)

  return docs
}

async function writeJson(fileName, value) {
  await writeFile(
    path.join(backupDir, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8'
  )
}

async function writeRestoreGuide(startedAt) {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
  const text = `# Восстановление audit-checklist-pwa

Дата бэкапа: ${startedAt}
Firebase project: ${projectId}
Версия приложения: ${packageJson.version}

## Что внутри

- \`source.tar.gz\` — исходный код без \`node_modules\`, \`dist\` и \`.git\`.
- \`firestore-data.json\` — локальная JSON-выгрузка коллекций \`${collections.join('`, `')}\`.
- \`firestore.rules\`, \`firebase.json\`, \`.firebaserc\` — Firebase-конфигурация проекта.

## Быстрое восстановление кода

\`\`\`bash
mkdir -p audit-checklist-pwa-restored
tar -xzf source.tar.gz -C audit-checklist-pwa-restored
npm install --prefix audit-checklist-pwa-restored
npm run build --prefix audit-checklist-pwa-restored
\`\`\`

## Данные Firestore

\`firestore-data.json\` хранит и человекочитаемые данные в \`data\`, и исходные Firestore REST-поля в \`fields\`.
Для полного обратного импорта лучше использовать отдельный restore-скрипт под целевой Firebase-проект, чтобы не перезаписать рабочую базу случайно.
`
  await writeFile(path.join(backupDir, 'restore.md'), text, 'utf8')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
