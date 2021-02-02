const fs = require('fs');
const path = require('path');
const zip = require('zlib');

var lib = {};
lib.baseDir = path.join(__dirname, '/../.logs/');

lib.append = (file, str, cb) => {
    fs.open(lib.baseDir + file + '.log', 'a', (err, fd) => {
        if (err && !fd) {
            return cb('Could not open the file for appending');
        }

        fs.appendFile(fd, str + '\n', err => {
            if (err) {
                return cb('Error appending to file');
            }
            fs.close(fd, err => {
                if (err) {
                    return cb(false);
                }
                return cb('Error closing the file that was being appended');
            })
        })
    })
}

module.exports = lib;