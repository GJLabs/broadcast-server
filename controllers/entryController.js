var fs = require('fs');
var writeFile = require('write');
var multiparty = require('multiparty');
var easyimg = require('easyimage');

var uploadToS3 = require('../config/utils.js').uploadToS3;
var db = require('../models/Database.js');


module.exports = {

  createEntry: function(req, res, next){

    var form = new multiparty.Form();

    new Promise((resolve, reject) => {
      
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

        for (var file in files) {
          var filedata = files[file][0];
          var temppath = filedata.path;
          var filetype = filedata.headers['content-type'].split('/')
          var filename = userId + '-' + Date.now() + '.' + filetype[1];

          // Build file paths
          var filedir = 'uploads/';
          var filepath = filedir + filename;
          var thumbnailName = 'thumb_' + filename;
          var thumbnailPath = filedir + thumbnailName;
          var tempThumbnailPath = 'static/' + filedir + thumbnailName;

          var fileContent = fs.readFileSync(temppath);

          // If image then create thumbnail and upload to S3
          if (filetype[0] === 'image') {
            // Upload image to S3 and set filepath on entry object
            entry.filepath =  uploadToS3(filepath, fileContent);
          } else {
            // Upload audio file to S3 and set filepath on entry object
            entry.audiopath =  uploadToS3(filepath, fileContent);
          }
          resolve(entry);
        } // end for in files loop
      }) // end form.parse
    }) // end promise
    .then((entry) => {
      db.Entry.create(entry)
      .then((newEntry) => {
        res.json(newEntry);
      })
      .catch((err) => {
        res.status(500).json(err);
      })
    })
    .catch((err) => {
      res.status(500).json(err);
    })

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