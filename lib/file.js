const path = require('path');
const fs = require('fs');
const helpers = require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '../.data/');


lib.create = function (dir, file, data, callback) {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function (err, fd) {
        if (err || !fd) {
            console.log(err);
            return callback('Error in creating the file!');
        }
        var stringData = JSON.stringify(data);

        fs.write(fd, stringData, function (err) {
            if (err) {
                return callback('Error writing to new file');
            }
            fs.close(fd, function (err) {
                if (err) {
                    return callback('Error in closing the file');
                }
                callback(false);
            });
        })
    })
}

lib.read = (dir, file, callback) => {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
        if (err) {
            return callback('Error in reading file');
        }
        callback(null, helpers.parseJsonToObject(data));
    })
}

lib.update = (dir, file, data, cb) => {
    data = JSON.stringify(data);
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', (err, fd) => {
        if (err && !fd) return cb(`Error in opening ${lib.baseDir + dir + '/' + file + '.json'} file!`);
        fs.ftruncate(fd, (err) => {
            if (err) return cb('Error in truncating the file');
            fs.writeFile(fd, data, err => {
                if (err) return cb('Error in writing the file');
                fs.close(fd, err => {
                    if (err) return cb('Error in closing the file');
                    cb(null, data);
                })
            })
        })
    })
}

lib.delete = (dir, file, cb) => {
    fs.unlink(lib.baseDir + '/' + dir + '/' + file + '.json', err => {
        if (err) {
            return cb(err);
        }
        cb(false);
    })
}

lib.list = (dir, cb) => {
    console.log(lib.baseDir + dir + '/');
    fs.readdir(lib.baseDir + dir + '/', (err, files) => {
        if (err || !files || files.length < 1) {
            return cb(err, files);
        }
        let trimmedPath = [];
        files.forEach(file => {
            trimmedPath.push(file.replace('.json', ''))
        });
        cb(null, trimmedPath);
    })
}

module.exports = lib;