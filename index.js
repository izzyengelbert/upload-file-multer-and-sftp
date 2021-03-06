const express = require('express')
const multer = require('multer')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const Loki = require('lokijs')
const { fileFilter, loadCollection, uploadSftp, cleanFolder } = require('./utils');
const JSZip = require('jszip');

// setup
const DB_NAME = 'db.json';
const COLLECTION_NAME = 'images';
const UPLOAD_PATH = 'uploads';
const upload = multer({ dest: `${UPLOAD_PATH}/`, fileFilter: fileFilter });
const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, { persistenceMethod: 'fs' });

// optional: clean all data before start
cleanFolder(UPLOAD_PATH);

// app
const app = express();
app.use(cors());

app.get('/', async (req, res) => {
    // default route
    res.send(`
        <h1>Demo file upload</h1>
        <p>Please refer to <a href="https://scotch.io/tutorials/express-file-uploads-with-multer">my tutorial</a> for details.</p>
        <ul>
            <li>GET /images   - list all upload images</li>
            <li>GET /images/{id} - get one uploaded image</li>
            <li>POST /profile - handle single image upload</li>
            <li>POST /photos/upload - handle multiple images upload</li>
        </ul>
    `);
})

app.post('/profile', upload.single('avatar'), async (req, res) => {
    try {
        const col = await loadCollection(COLLECTION_NAME, db);
        const data = col.insert(req.file);

        db.saveDatabase();
        res.send({ id: data.$loki, fileName: data.filename, originalName: data.originalname });
    } catch (err) {
        res.sendStatus(400);
    }
})

app.post('/file', upload.single('file'), async (req, res) => {
  try {      
      const col = await loadCollection(COLLECTION_NAME, db);
      const data = col.insert(req.file);
      const targetName = `${data.$loki}-${req.file.originalname}`
      
      const stream = fs.createReadStream(req.file.path);
      await uploadSftp(stream, targetName)
      db.saveDatabase();
      
      res.send({ id: data.$loki, fileName: data.filename, originalName: data.originalname });
  } catch (err) {
      res.status(400).send(err.message);
  }
})

app.post('/files', upload.array('files', 12), async (req, res) => {
  try {
      const col = await loadCollection(COLLECTION_NAME, db)
      const data = [].concat(col.insert(req.files));
      const zip = new JSZip()
      const targetName = `Files.zip`
      req.files.forEach((file) => {
        zip.file(file.originalname, fs.createReadStream(file.path))
      })
      
      const buffer = zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
      
      await uploadSftp(buffer, targetName)
      db.saveDatabase();
      res.send(data.map(x => ({ id: x.$loki, fileName: x.filename, originalName: x.originalname })));
  } catch (err) {
    res.status(400).send(err.message);
  }
})

app.post('/photos/upload', upload.array('photos', 12), async (req, res) => {
    try {
        const col = await loadCollection(COLLECTION_NAME, db)
        let data = [].concat(col.insert(req.files));

        db.saveDatabase();
        res.send(data.map(x => ({ id: x.$loki, fileName: x.filename, originalName: x.originalname })));
    } catch (err) {
        res.sendStatus(400);
    }
})

app.get('/images', async (req, res) => {
    try {
        const col = await loadCollection(COLLECTION_NAME, db);
        res.send(col.data);
    } catch (err) {
        res.sendStatus(400);
    }
})

app.get('/images/:id', async (req, res) => {
    try {
        const col = await loadCollection(COLLECTION_NAME, db);
        const result = col.get(parseInt(req.params.id));

        if (!result) {
            res.sendStatus(404);
            return;
        };

        res.setHeader('Content-Type', result.mimetype);
        fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
    } catch (err) {
        res.sendStatus(400);
    }
})

app.listen(3000, function () {
    console.log('listening on port 3000!');
})