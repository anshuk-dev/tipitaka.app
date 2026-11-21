import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const dbPath = fs.existsSync(path.join(root, 'db/text.db'))
  ? path.join(root, 'db/text.db')
  : path.join(root, 'e2e/fixtures/db/text.db')

console.log(`Using database: ${dbPath}`)
const db = new Database(dbPath)

// 1. Meta
const metaRows = db.prepare('SELECT k, v FROM meta').all() as { k: string; v: string }[]
const metaMap = Object.fromEntries(metaRows.map(r => [r.k, r.v]))
const meta = {
  contentHash: metaMap.content_hash || '',
  dbVersion: metaMap.db_version || '',
  upstream: metaMap.upstream || '',
  builtAt: metaMap.built_at || '',
  hasDict: false,
}

// 2. Books
interface DbBook {
  id: number
  name: string
  coll: string
  title: string
  root: string
  paraCount: number
}
const books = db
  .prepare('SELECT b.id, b.name, b.coll, b.title, n.key as root, b.para_count as paraCount FROM book b JOIN node n ON b.root_id = n.id')
  .all() as DbBook[]
const booksMap = Object.fromEntries(books.map(b => [b.id, b]))

// 3. Nodes & Children
interface DbNode {
  id: number
  key: string
  parent: number
  book: number
  kind: string
  coll: string
  rend: string
  title: string
  start: number
  end: number
  depth: number
  children: number
  prev: string
  next: string
  mirror: string
}

const allNodes = db
  .prepare(
    'SELECT id, key, parent_id as parent, book_id as book, kind, coll, rend, title, para_start as start, para_end as end, depth, child_count as children, prev_key as prev, next_key as next, mirror_key as mirror FROM node',
  )
  .all() as DbNode[]

const nodeById = new Map<number, DbNode>()
for (const n of allNodes) nodeById.set(n.id, n)

function getPath(node: DbNode) {
  const pathArr = []
  let curr = node.parent >= 0 ? nodeById.get(node.parent) : null
  while (curr) {
    pathArr.unshift({
      key: curr.key,
      book: curr.book,
      kind: curr.kind,
      coll: curr.coll,
      rend: curr.rend,
      title: curr.title,
      start: curr.start,
      end: curr.end,
      depth: curr.depth,
      children: curr.children,
    })
    curr = curr.parent >= 0 ? nodeById.get(curr.parent) : null
  }
  return pathArr
}

const nodeInfos: Record<string, unknown> = {}
const childrenMap: Record<string, unknown[]> = { '': [] }

for (const n of allNodes) {
  const nodeClean = {
    key: n.key,
    book: n.book,
    kind: n.kind,
    coll: n.coll,
    rend: n.rend,
    title: n.title,
    start: n.start,
    end: n.end,
    depth: n.depth,
    children: n.children,
    prev: n.prev || undefined,
    next: n.next || undefined,
  }

  if (n.parent < 0) {
    childrenMap[''].push(nodeClean)
  } else {
    const parentNode = nodeById.get(n.parent)
    if (parentNode) {
      if (!childrenMap[parentNode.key]) childrenMap[parentNode.key] = []
      childrenMap[parentNode.key].push(nodeClean)
    }
  }

  nodeInfos[n.key] = {
    ...nodeClean,
    path: getPath(n),
    commentary: [],
    paraCount: n.end - n.start,
  }
}

// 4. Paras by book
interface DbPara {
  b: number
  i: number
  k: string
  r: string
  n: string
  t: string
}

const parasByBook: Record<number, { i: number; k: string; r: string; n?: string; t: string }[]> = {}
for (const b of books) parasByBook[b.id] = []

const allParas = db
  .prepare('SELECT p.book_id as b, p.idx as i, n.key as k, p.rend as r, p.num as n, p.text as t FROM para p JOIN node n ON p.node_id = n.id ORDER BY p.book_id, p.idx')
  .all() as DbPara[]

for (const p of allParas) {
  parasByBook[p.b].push({
    i: p.i,
    k: p.k,
    r: p.r,
    n: p.n || undefined,
    t: p.t,
  })
}

// 5. Translations by book
interface DbTranslation {
  b: number
  i: number
  title: string
  t: string
  v?: string
  lang: string
  source: string
  translator: string
  conf: number
}

const translationsByBook: Record<number, unknown[]> = {}
for (const b of books) translationsByBook[b.id] = []

const allTranslations = db
  .prepare(
    'SELECT t.book_id as b, t.para_idx as i, t.title, t.text as t, t.verse as v, t.lang, t.source, t.translator, t.conf FROM translation t ORDER BY t.book_id, t.para_idx',
  )
  .all() as DbTranslation[]

for (const tr of allTranslations) {
  translationsByBook[tr.b].push({
    i: tr.i,
    title: tr.title,
    t: tr.t,
    v: tr.v,
    lang: tr.lang,
    source: tr.source,
    translator: tr.translator,
    conf: tr.conf,
  })
}

const output = {
  meta,
  books: booksMap,
  childrenMap,
  nodeInfos,
  parasByBook,
  translationsByBook,
}

const publicDir = path.join(root, 'web/public')
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

const outPath = path.join(publicDir, 'static-data.json')
fs.writeFileSync(outPath, JSON.stringify(output))

const stat = fs.statSync(outPath)
console.log(`Saved static-data.json to ${outPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`)
console.log(`Exported ${Object.keys(nodeInfos).length} nodes, ${books.length} books, ${allParas.length} paras, ${allTranslations.length} translations.`)
