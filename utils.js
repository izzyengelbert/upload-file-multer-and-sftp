const del = require('del');
const Client = require('ssh2-sftp-client');

const config = {
  host: '127.0.0.1',
  port: '2222',
  username: 'foo',
  password: 'pass'
}

const imageFilter = function (req, file, cb) {
    // accept image only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const fileFilter = function (req, file, cb) {
    // accept image only
    if (!file.originalname.match(/\.(pdf)$/)) {
        return cb(new Error('Only pdf files are allowed!'), false);
    }
    cb(null, true);
};

const loadCollection = function (colName, db) {
    return new Promise(resolve => {
        db.loadDatabase({}, () => {
            const _collection = db.getCollection(colName) || db.addCollection(colName);
            resolve(_collection);
        })
    });
}

const cleanFolder = function (folderPath) {
    // delete files inside folder but not the folder itself
    del.sync([`${folderPath}/**`, `!${folderPath}`]);
};

const uploadSftp = async function (path, targetName) {
  const remote = `/share/${targetName}`;
  
  const client = new Client();
  
  await client.connect(config)
  await client.put(path, remote);
  await client.end();
}

module.exports = { imageFilter, fileFilter, loadCollection, cleanFolder, uploadSftp }
