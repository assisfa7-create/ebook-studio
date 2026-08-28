const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const png2icons = require('png2icons')

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="220" fill="#18181b"/>
  <rect x="240" y="260" width="544" height="120" rx="60" fill="#d97706"/>
  <rect x="240" y="440" width="544" height="120" rx="60" fill="#f59e0b"/>
  <rect x="240" y="620" width="400" height="120" rx="60" fill="#fbbf24"/>
  <circle cx="720" cy="680" r="58" fill="#fafaf9"/>
</svg>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1024,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  })
  await win.loadURL('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG))
  await new Promise(r => setTimeout(r, 500))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })
  const png = img.toPNG()
  const buildDir = path.join(__dirname, '..', 'build')
  fs.mkdirSync(buildDir, { recursive: true })
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png)
  const ico = png2icons.createICO(png, png2icons.BICUBIC, 0, true)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico)
  console.log('icon OK:', png.length, 'bytes png,', ico.length, 'bytes ico')
  app.quit()
})
