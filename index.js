const config = require('config')
const polka = require('polka')
const fse = require('fs-extra')
const path = require('path')
const { nanoid } = require('nanoid')

const storagePath = process.env.path || config.get('path')
const port = +process.env.port || +config.get('port')
const file_length = +process.env.file_length || +config.get('file_length')
const key = process.env.key || config.get('key')
const passwrd = process.env.passwrd || config.get('passwrd')

const server = polka()

server.post('/upload', async (req, res) => {
  try {
    if (req.query.key !== key || req.headers.passwrd !== passwrd) {
      return server.onNoMatch(req, res)
    }

    const image = await new Promise((resolve) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
    })

    const fileName = nanoid(file_length) + '.png'
    const filePath = path.join(__dirname, storagePath, fileName)
    const link = `${req.connection.encrypted ? 'https' : 'http'}://${req.headers.host}/${storagePath}/${fileName}`

    await fse.writeFile(filePath, image)

    res.writeHead(200, { "Content-Type": "application/json" })

    return res.end(
      JSON.stringify({
        data: {
          link,
        },
      })
    )
  } catch (err) {
    console.log('err', err)
    return res.setHeader('status', 500).end('Something went wrong, try again later.')
  }
})

server.get('/files/:fileName', async (req, res) => {
  const fileName = req.params.fileName

  try {
    const filePath = path.join(__dirname, storagePath, fileName)

    if (!(await fse.exists(filePath))) {
      console.log('File not exists: ' + fileName)
      return server.onNoMatch(req, res)
    }

    console.log('Open file: ' + fileName)

    res.setHeader("Content-Disposition", "inline")
    res.setHeader('Content-Type', 'image/png')

    fse.createReadStream(filePath).pipe(res)
  } catch (err) {
    console.log(`Can't handle: ` + fileName)
    console.log('err', err)
    return server.onNoMatch(req, res)
  }
})

server.listen(port, () => console.log('Started on port: ' + port))
