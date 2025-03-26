const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const oracledb = require('oracledb');
require('dotenv').config();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/uploads');
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12, function (err, bytes) {
            if (err) throw err;
            const fn = bytes.toString('hex') + path.extname(file.originalname);
            cb(null, fn);
            saveFileMetadataToDB(fn, file.originalname);
        });
    }
});

const upload = multer({ storage: storage });

async function saveFileMetadataToDB(filename, originalname) {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: 'sys',
            password: 'Aryan2023030#',
            connectString: 'localhost/orcl'
        });

        const result = await connection.execute(
            `INSERT INTO uploaded_files (filename, originalname, upload_date) VALUES (:filename, :originalname, SYSDATE)`,
            { filename, originalname },
            { autoCommit: true }
        );

        console.log('File metadata saved to database:', result);
    } catch (err) {
        console.error('Error saving file metadata to database:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
}

module.exports = upload;