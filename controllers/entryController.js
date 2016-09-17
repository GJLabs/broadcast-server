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
          console.log('err: ', err);
          reject(err);
        }
        // console.log('FILES:', files)
        // console.log('FIELDS:', fields)
        // Store entry text and location on entry object
        entry.text = fields.text[0];
        entry.location = fields.location[0];

        for (var file in files) {
          // console.log('FILE:', files[file])
          var filedata = files[file][0];
          var temppath = filedata.path;
          var filetype = filedata.headers['content-type'].split('/')
          var filename = userId + '-' + Date.now() + '.' + filetype[1];
          console.log('FILETYPE1:', filetype)
          // Build file paths
          var filedir = 'uploads/';
          var filepath = filedir + filename;
          var thumbnailName = 'thumb_' + filename;
          var thumbnailPath = filedir + thumbnailName;
          var tempThumbnailPath = 'static/' + filedir + thumbnailName;


          fs.readFile(temppath, function(err, data) {
            if (err) {
              reject(err)
            }

            console.log('FILETYPE2:', filetype);
            // If image then create thumbnail and upload to S3
            if (filetype[0] === 'image') {

              console.log('IMAGE DETECTED')
              // Upload image to S3 and set filepath on entry object
              // entry.filepath =  uploadToS3(filepath, data);
              entry.filepath = 'image here'
              // create thumbnail
              easyimg.rescrop({
                 src: temppath, 
                 dst: tempThumbnailPath,
                 width:60, 
                 height:60,
              }) // end easyimg.thumbnail
              .then((thumbnail) => {
                fs.readFile(tempThumbnailPath, function(err, data) {
                  if (err) {
                    reject(err);
                  }
                  // Upload to S3 and set thumbnail filepath
                  // entry.thumbnail = uploadToS3(thumbnailPath, data);
                  entry.thumbnail = 'thumbnail path here';
                  // Delete temporary local thumbnail
                  // fs.unlink(tempThumbnailPath, function(err, data) {
                  //   if (err) {
                  //     console.log('Temporary local thumbnail deletion error', err);
                  //   }
                  // })
                }) // end fs.readFile
              })
              .catch((err) => {
                reject(err);
              })
            } else {
              // Upload audio file to S3 and set filepath on entry object
              entry.audiopath =  uploadToS3(filepath, data);
            }
            resolve(entry);
          }) // end fs.readFile
        } // end for in files loop
      }) // end form.parse
    }) // end promise
    .then((entry) => {
      res.json(entry)
      // db.Entry.create(entry)
      // .then((newEntry) => {
      //   res.json(newEntry);
      // })
      // .catch((err) => {
      //   res.status(500).json(err);
      // })
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