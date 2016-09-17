var fs = require('fs');
var writeFile = require('write');
var multiparty = require('multiparty');
var easyimg = require('easyimage');

var uploadToS3 = require('../config/utils.js').uploadToS3;
var db = require('../models/Database.js');


module.exports = {

  createEntry: function(req, res, next){

    var form = new multiparty.Form();
      
    // initialize entry object with userId
    var userId = req.user.id;
    var entry = {userId: userId};

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      }

      // Store entry text and location on entry object
      entry.text = fields.text[0];
      entry.location = fields.location[0];

      var fileIndex = files.file ? files.file.length - 1 : 0;
      // var fileIndex = filesArray.length - 1;

      function parseFiles() {
        return new Promise((resolve, reject) => {
          if (!files.file) {
            // resolve if no files
            resolve(entry);
          }
          // initiate variables
          var file = files.file[fileIndex];
          var temppath = file.path;
          var filetype = file.headers['content-type'].split('/');
          var filename = userId + '-' + Date.now() + '.' + filetype[1];
          // Build file paths
          var filedir = 'uploads/';
          var filepath = filedir + filename;
          var thumbnailName = 'thumb_' + filename;
          var thumbnailPath = filedir + thumbnailName;
          var tempThumbnailPath = 'static/' + filedir + thumbnailName;

          // read original files
          fs.readFile(temppath, (err, data) => {
            if (filetype[0] === 'image') {
              // upload original image and update entry object
              entry.filepath = uploadToS3(filepath, data);
              easyimg.rescrop({
                 src: temppath, 
                 dst: tempThumbnailPath,
                 width:60, 
                 height:60,
              })
              .then((image) => {
                fs.readFile(tempThumbnailPath, function(err, data) {
                  if (err) {
                    reject(err);
                  }
                  // Upload to S3 and set thumbnail filepath
                  entry.thumbnail = uploadToS3(thumbnailPath, data);
                  // Delete temporary local thumbnail
                  fs.unlink(tempThumbnailPath, function(err, data) {
                    if (err) {
                      console.log('Temporary local thumbnail deletion error', err);
                    }
                  })
                  resolve(entry);
                })
              })
            } else {
              // else file must be audio
              entry.audiopath = uploadToS3(filepath, data);
              resolve(entry);
            }
          })
        })
        .then((entry) => {
          return new Promise((resolve, reject) => {
            if (fileIndex > 0) {
              // decrement file index and parse next file
              fileIndex--;
              parseFiles();
            } else {
              // all files have been parsed
              resolve(entry);
            }
          })
        })
        .then((entry) => {
          // finished parsing files. send response to client. 
          db.Entry.create(entry)
          .then((newEntry) => {
            res.json(newEntry);
          })
          .catch((err) => {
            res.json(err)
          })
        })
      }

      // Start parsing all form files
      parseFiles();

    }) // end form.parse

  },

  getEntries: function(req, res, next) {
    if (req.query.userId && (req.query.userId !== req.user.id.toString())) {
      // check if req.query.userId is in friendlist
      db.Relationships.findOne({ 
        where: { user1: req.user.id, user2: req.query.userId }
      })
        .then(function(friends) {
          if (friends) {
            // send entries
            db.Entry.findAll({ 
              where: { userId: req.query.userId },
              order: [['createdAt', 'DESC']]
            })
              .then(function(entries){
                res.send(entries);
              })
              .catch(function(err){
                res.status(404).json(err)
              });
          } else {
            res.status(404).json({ error: 'you are not friends'})
          }
        })
        .catch(function(err) {
          res.status(404).json(err)
        });
    } else {
      db.Entry.findAll({ 
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
      })
      .then(function(entries){
        res.send(entries);
      })
      .catch(function(err){
        res.status(404).json({error: 'Error retrieving entires: ' + err});
      });
    }
  }

};