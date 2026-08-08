/**
 * Downloads the official Aruamz Productions assets from the legacy WordPress
 * media library into `public/`, then writes an image manifest (with intrinsic
 * dimensions) that the homepage content layer consumes.
 *
 * Run once after cloning:  node scripts/fetch-assets.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const UPLOADS = 'https://aruamzproductions.com/wp-content/uploads/'
const PUBLIC = path.join(ROOT, 'public')

const masonry = JSON.parse(
  await readFile(path.join(ROOT, '_reference', 'masonry.json'), 'utf8'),
)
  .filter((item) => !item.src.includes('Aruamz-production'))
  .map((item, index) => ({
    remote: item.src.replace(UPLOADS, ''),
    dir: 'projects',
    name: `project-${String(index + 1).padStart(2, '0')}`,
    width: item.w,
    height: item.h,
  }))

const brand = [
  { remote: '2020/03/Aruamz-production.png', dir: 'brand', name: 'logo' },
  { remote: '2020/03/ceo.png', dir: 'brand', name: 'ceo-portrait' },
  { remote: '2020/03/sigggn.png', dir: 'brand', name: 'ceo-signature' },
  { remote: '2020/03/yutbe.png', dir: 'brand', name: 'showreel-poster' },
]

const textures = [
  { remote: '2020/03/baklaningd.jpg', dir: 'textures', name: 'hero' },
  { remote: '2020/03/abt02.jpg', dir: 'textures', name: 'who-we-are' },
  { remote: '2020/03/abt3.jpg', dir: 'textures', name: 'mission' },
]

const clientFiles = [
  '2020/03/1-230x157.jpg',
  '2020/03/0002-230x157.jpg',
  '2020/03/takeii-230x157.jpg',
  '2020/03/006-230x157.jpg',
  '2020/03/5-230x157.jpg',
  '2020/03/ramdan-230x157.jpg',
  '2020/11/rsz_1-230x157-1-230x157.png',
  '2021/07/NTClogo-230x157.jpg',
  '2021/07/SZ-230x157.jpg',
  '2021/10/WM-1-230x157.jpg',
  '2021/12/clients20-230x157.jpg',
  '2022/07/metalEAi-230x157.jpg',
]
const clients = clientFiles.map((remote, index) => ({
  remote,
  dir: 'clients',
  name: `client-${String(index + 1).padStart(2, '0')}`,
}))

const testimonials = [
  { remote: '2021/12/Nadia.jpg', name: 'nadya-mistry' },
  { remote: '2020/03/testi9-e1584626473126.jpg', name: 'ejaaz-khan' },
  { remote: '2020/03/testi8-1-e1584454573600.jpg', name: 'syed-amjad-ali-shah' },
  { remote: '2020/03/testi4-e1584389451557.jpg', name: 'hassan-mehmood' },
  { remote: '2018/01/testi1-2-e1584389290395.png', name: 'fahad-jawaid' },
  { remote: '2018/01/testi2-1-e1584389321399.jpg', name: 'syeda-uzma-shah' },
  { remote: '2018/01/testi3-e1584389198726.jpg', name: 'arooba' },
].map((entry) => ({ ...entry, dir: 'testimonials' }))

const queue = [...brand, ...textures, ...masonry, ...clients, ...testimonials]

for (const dir of ['brand', 'textures', 'projects', 'clients', 'testimonials']) {
  await mkdir(path.join(PUBLIC, dir), { recursive: true })
}

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.warn('sharp unavailable - dimensions will fall back to source values')
}

const manifest = []
let downloaded = 0
let cached = 0

for (const asset of queue) {
  const ext = path.extname(asset.remote) || '.jpg'
  const file = `${asset.name}${ext}`
  const abs = path.join(PUBLIC, asset.dir, file)
  const src = `/${asset.dir}/${file}`

  if (existsSync(abs)) {
    cached += 1
  } else {
    const url = UPLOADS + asset.remote
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`FAIL ${response.status} ${url}`)
      continue
    }
    await writeFile(abs, Buffer.from(await response.arrayBuffer()))
    downloaded += 1
  }

  let { width, height } = asset
  if (sharp) {
    const meta = await sharp(abs).metadata()
    width = meta.width
    height = meta.height
  }
  manifest.push({ key: asset.name, group: asset.dir, src, width, height })
  console.log(`${src}  ${width}x${height}`)
}

await mkdir(path.join(ROOT, 'src', 'content'), { recursive: true })
await writeFile(
  path.join(ROOT, 'src', 'content', 'assets.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
)

console.log(`\n${manifest.length} assets ready (${downloaded} downloaded, ${cached} cached)`)
