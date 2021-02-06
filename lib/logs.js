const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { ZIP_EXTENSTION, LOG_EXTENSTION } = require('./constants');

var lib = {};
lib.baseDir = path.join(__dirname, '/../.logs/');


lib.append = (file, str, cb) => {
    fs.open(lib.baseDir + file + LOG_EXTENSTION, 'a', (err, fd) => {
        if (err && !fd) {
            return cb('Could not open the file for appending');
        }

        fs.appendFile(fd, str + '\n', err => {
            if (err) {
                return cb('Error appending to file');
            }
            fs.close(fd, err => {
                if (err) {
                    return cb('Error closing the file that was being appended');
                }
                return cb(false);
            })
        })
    })
};

//list all the logs, and optionally include the compressed log 
lib.list = (isCompressIncluded, cb) => {
    fs.readdir(lib.baseDir, (err, fileNames) => {
        if (err || !Array.isArray(fileNames) || fileNames.length < 1) {
            return cb(err, fileNames);
        }
        var trimmedFileNames = [];
        fileNames.forEach(fileName => {
            if (fileName.includes(LOG_EXTENSTION)) {
                trimmedFileNames.push(fileName.replace(LOG_EXTENSTION, ''));
            }
            if (fileName.includes(ZIP_EXTENSTION) && isCompressIncluded) {
                trimmedFileNames.push(fileName.replace(ZIP_EXTENSTION, ''));
            }
        });
        cb(false, trimmedFileNames);
    });
};


lib.compress = (logId, newFileId, cb) => {
    fs.readFile(lib.baseDir + logId + LOG_EXTENSTION, 'utf8', (err, inputStrting) => {
        if (err || !inputStrting) {
            return cb(err);
        }
        zlib.gzip(inputStrting, (err, buffer) => {
            if (err) {
                return cb(err);
            }
            fs.open(lib.baseDir + newFileId + ZIP_EXTENSTION, 'wx', (err, fd) => {
                if (err || !fd) {
                    return cb(err);
                }
                fs.writeFile(fd, buffer.toString('base64'), err => {
                    if (err) {
                        return cb(err);
                    }
                    fs.close(fd, err => {
                        if (err) {
                            return cb(err);
                        }
                        return cb(false);
                    })
                })
            })
        })
    })
};


lib.decompress = (fileId, cb) => {
    fs.readFile(lib.baseDir + fileId + ZIP_EXTENSTION, 'utf8', (err, str) => {
        if (err || !str) {
            return cb(err);
        }
        const inputBuffer = Buffer.from(str, 'base64');
        zlib.unzip(inputBuffer, (err, outputBuffer) => {
            if (err || !outputBuffer) {
                return cb(err);
            }
            return cb(false, outputBuffer.toString());
        })
    })
};


lib.truncate = (logId, cb) => {
    fs.truncate(lib.baseDir + logId + LOG_EXTENSTION, 0, err => {
        cb(err);
    })
}

module.exports = lib;