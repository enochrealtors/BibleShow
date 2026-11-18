import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream, createWriteStream, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'resources', 'speech-models')
const models = [
  { repo: 'csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17', revision: 'd42f2d9f7ca24806fb667456a18a9f1b60f70d16', name: 'encoder-epoch-99-avg-1.int8.onnx', minimumBytes: 42_000_000 },
  { repo: 'csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17', revision: 'd42f2d9f7ca24806fb667456a18a9f1b60f70d16', name: 'decoder-epoch-99-avg-1.onnx', minimumBytes: 530_000 },
  { repo: 'csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17', revision: 'd42f2d9f7ca24806fb667456a18a9f1b60f70d16', name: 'joiner-epoch-99-avg-1.int8.onnx', minimumBytes: 250_000 },
  { repo: 'csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17', revision: 'd42f2d9f7ca24806fb667456a18a9f1b60f70d16', name: 'tokens.txt', minimumBytes: 5_000 },
  { repo: 'csukuangfj/sherpa-onnx-whisper-tiny', revision: '65176e2deb88badc814a94058666cadccc29b61c', name: 'tiny-encoder.int8.onnx', minimumBytes: 12_937_772, sha256: 'd24fb083ae3b1041fc24e97971d60e280c9342201fbb67b0ab428a8b4a51a434' },
  { repo: 'csukuangfj/sherpa-onnx-whisper-tiny', revision: '65176e2deb88badc814a94058666cadccc29b61c', name: 'tiny-decoder.int8.onnx', minimumBytes: 89_855_401, sha256: 'd2fece8dd42771f1df975c6c0445770d0c292bf7547c2cae04a6c0cc57540925' },
  { repo: 'csukuangfj/sherpa-onnx-whisper-tiny', revision: '65176e2deb88badc814a94058666cadccc29b61c', name: 'tiny-tokens.txt', minimumBytes: 816_730, sha256: 'b34b360dbb493e781e479794586d661700670d65564001f23024971d1f2fa126' },
  { repo: 'csukuangfj/sherpa-onnx-whisper-tiny.en', revision: 'd026532c022fa99fd789d6b32446a1df7b6bfc43', name: 'tiny.en-encoder.int8.onnx', minimumBytes: 12_937_772, sha256: '0ce578b827c94a961aacb8fa14b02f096504b337e5c94be37c36238cbe3e8bc6' },
  { repo: 'csukuangfj/sherpa-onnx-whisper-tiny.en', revision: 'd026532c022fa99fd789d6b32446a1df7b6bfc43', name: 'tiny.en-decoder.int8.onnx', minimumBytes: 89_853_865, sha256: '06c0e6ff6348d427e51839219d1c886c18cfdf411e629e33f5e1679bff9c1527' },
  { repo: 'csukuangfj/sherpa-onnx-whisper-tiny.en', revision: 'd026532c022fa99fd789d6b32446a1df7b6bfc43', name: 'tiny.en-tokens.txt', minimumBytes: 830_000, sha256: '306cd27f03c1a714eca7108e03d66b7dc042abe8c258b44c199a7ed9838dd930' },
]

mkdirSync(root, { recursive: true })
for (const model of models) await prepare(model)
console.log(`Offline speech models ready in ${root}`)

async function prepare({ repo, revision, name, minimumBytes, sha256 }) {
  const destination = path.join(root, name)
  if (await validFile(destination, minimumBytes, sha256)) return
  const temporary = `${destination}.download`
  let ready = false
  for (let attempt = 1; attempt <= 8 && !ready; attempt += 1) {
    const offset = fileSize(temporary)
    try {
      console.log(`Downloading ${name} from ${(offset / 1_000_000).toFixed(1)} MB (attempt ${attempt}/8)…`)
      const url = `https://huggingface.co/${repo}/resolve/${revision}/${name}`
      const response = await fetch(url, { headers: offset ? { Range: `bytes=${offset}-` } : undefined, signal: AbortSignal.timeout(300_000) })
      if (![200, 206].includes(response.status) || !response.body) throw new Error(`HTTP ${response.status}`)
      const append = offset > 0 && response.status === 206
      const contentRange = response.headers.get('content-range')
      if (append && !contentRange?.startsWith(`bytes ${offset}-`)) throw new Error('The server returned an invalid resume range.')
      const expectedSize = Number(contentRange?.split('/')[1] ?? response.headers.get('content-length'))
      if (!append) rmSync(temporary, { force: true })
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: append ? 'a' : 'w' }))
      const size = fileSize(temporary)
      if (size < minimumBytes || (Number.isFinite(expectedSize) && expectedSize > 0 && size < expectedSize)) {
        throw new Error(`Downloaded ${size} bytes; expected at least ${Math.max(minimumBytes, expectedSize || 0)}.`)
      }
      if (sha256 && await hashFile(temporary) !== sha256) {
        rmSync(temporary, { force: true })
        throw new Error('The model checksum did not match its pinned SHA-256.')
      }
      ready = true
    } catch (error) {
      try {
        if (!await validFile(temporary, minimumBytes, sha256)) {
          downloadWithPython(`https://huggingface.co/${repo}/resolve/${revision}/${name}`, temporary, fileSize(temporary))
          if (!await validFile(temporary, minimumBytes, sha256)) throw new Error('The downloaded model failed its size or checksum check.')
        }
        ready = true
      } catch (fallbackError) {
        console.warn(`HTTPS fallback failed: ${fallbackError}`)
      }
      if (ready) break
      if (attempt === 8) throw new Error(`Could not prepare ${name} after 8 resumable attempts: ${error}`)
      console.warn(`Download interrupted; keeping partial data and retrying: ${error}`)
      await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 2_000, 10_000)))
    }
  }
  renameSync(temporary, destination)
  console.log(`Prepared ${name} (${(statSync(destination).size / 1_000_000).toFixed(1)} MB)`)
}

function downloadWithPython(url, destination, offset) {
  const source = `import shutil,sys,urllib.request\nu,path,offset=sys.argv[1],sys.argv[2],int(sys.argv[3])\nheaders={'Range':f'bytes={offset}-'} if offset else {}\nrequest=urllib.request.Request(u,headers=headers)\nwith urllib.request.urlopen(request,timeout=300) as response:\n append=offset>0 and response.status==206\n if append and not response.headers.get('Content-Range','').startswith(f'bytes {offset}-'): raise RuntimeError('Invalid resume range')\n with open(path,'ab' if append else 'wb') as output: shutil.copyfileobj(response,output,1024*1024)`
  const python = process.platform === 'win32' ? 'python' : 'python3'
  const result = spawnSync(python, ['-c', source, url, destination, String(offset)], { stdio: 'inherit', timeout: 300_000 })
  if (result.error || result.status !== 0) throw result.error ?? new Error(`${python} exited with code ${result.status}`)
}

async function hashFile(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

async function validFile(file, minimumBytes, sha256) {
  if (fileSize(file) < minimumBytes) return false
  return !sha256 || await hashFile(file) === sha256
}

function fileSize(file) {
  try { return statSync(file).size }
  catch { return 0 }
}
