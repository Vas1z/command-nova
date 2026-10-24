import { cp, copyFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
const firefoxDist = resolve(root, 'dist-firefox')
const firefoxManifest = resolve(root, 'firefox', 'manifest.json')

await rm(firefoxDist, { recursive: true, force: true })
await cp(dist, firefoxDist, { recursive: true })
await copyFile(firefoxManifest, resolve(firefoxDist, 'manifest.json'))

console.log('\nFirefox build ready: dist-firefox/')
console.log('Load it at about:debugging#/runtime/this-firefox → Load Temporary Add-on.')
