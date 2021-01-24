const path = require('path');
const fs = require('fs');
const helpers = require('./helpers');

const lib = {};

lib.base_dir = path.join(__dirname, '../.data/');


lib.create = function (dir, file, data, callback) {
    fs.open(lib.base_dir + dir + '/' + file + '.json', 'wx', function (err, fd) {
        if (err || !fd) {
            console.log(err);
            return callback('Error in creating the file!');
        }
        var string_data = JSON.stringify(data);

        fs.write(fd, string_data, function (err) {
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
    fs.readFile(lib.base_dir + dir + '/' + file + '.json', 'utf8', (err, data) => {
        if (err) {
            return callback('Error in reading file');
        }
        callback(null, helpers.parseJsonToObject(data));
    })
}

lib.update = (dir, file, data, cb) => {
    data = JSON.stringify(data);
    fs.open(lib.base_dir + dir + '/' + file + '.json', 'r+', (err, fd) => {
        if (err && !fd) return cb(`Error in opening ${lib.base_dir + dir + '/' + file + '.json'} file!`);
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
    fs.unlink(lib.base_dir + '/' + dir + '/' + file + '.json', err => {
        if (err) {
            return cb(err);
        }
        cb(false);
    })
}

module.exports = lib;