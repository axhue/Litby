var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')

mongoose.connect('mongodb://admin:1234go@ds041939.mlab.com:41939/literarius')
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
var entry = mongoose.Schema({
    fbid: String,
    time: String,
    msgs:String,
    category:String,
    num: Number,
    doc_index:Number
})
var short_story = mongoose.model('short_story',entry)
var novel = mongoose.model('novel',entry)
var wp_response = mongoose.model('wp_response',entry)
var short_form = mongoose.model('short_form',entry)
var long_form = mongoose.model('long_form',entry)
var headline_resp = mongoose.model('headline_resp',entry)
var categories = [short_story,novel];

function assemble_data(req,res,count){
    short_story.count({fbid:req.query.fbid},function(err1, count){
      var rev_index = String(count - 1 - req.query.index)
      console.log(rev_index)
      console.log(req.query.index)
      short_story.findOne({fbid:req.query.fbid,doc_index:rev_index},function (err2,doc){
              if (err2){
                  console.log(err2)
              }
              if(doc){
                  //sort data by date
                  /*
                  function sortFactory(prop) {
                    return function(a,b){ return b[prop].localeCompare(a[prop]); };
                  }*/
                  res.render('editor', {doc:doc,
                                        entries:doc.msgs,
                                        fbid:req.query.fbid,
                                        index:req.query.index,
                                        count:count-1});
  
                
  
          }
  
    });
    });




}
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('editor', { title: 'Express' });
});

router.get('/geteditor', function(req, res, next) {
  assemble_data(req,res,req.query.count)
});
router.post('/savedb', function(req, res, next) {
  if (req.body.id === 'new_entry'){
    var now = new Date();
        db_entry = new novel({
        fbid:req.body.fbid,
        time:now.toISOString(),
        msg:req.body.msg
        })
        db_entry.save();
        res.status(200)
        res.send()
  }
  else{
    
        if (!req.body.msg){
          novel.findById(req.body.id).remove(function(err,res){if(err){console.log(err)}})
        }
        
        short_story.findById(req.body.id,function(err,res){
            res.msgs = req.body.data;
            res.save();
          });
            
  }
  res.status(200)
  res.send()

});


router.get('/jsoneditor', function(req, res, next) {

  var sendback = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Editor loaded 👍",
        "buttons": [
          {
            "type": "web_url",
            "url": 'https://stansonweb.herokuapp.com/litby/geteditor?index=0&fbid='+req.query.fbid,
            "title": "View editor"
          }
        ]
      }
    }
  };
  res.json([sendback])
  res.status(200);
  res.send();
  


});
router.get('/silenthook', function(req, res, next) {
  var texts = req.query.msg.split('|')
  for (var i = 0, len = texts.length; i < len; i++) {
        texts[i] = '<p>'.concat(texts[i],'</p>')
  }
  if(req.query.header){
    head=req.query.header;
    var headerhtml = '<h2>'.concat(head,'</h2>')
    texts[0] = headerhtml.concat(texts[0])
  }
  entry = texts.join('')
  short_story.findOne({fbid:req.query.fbid,num:{"$lte":20,"$gte":0}},function(err,doc) {
    if(err){console.log(err)}
    else{
      console.log(doc)
      if(doc){
        console.log('updating')
        doc.msgs = doc.msgs.concat(entry)
        doc.num+=1
        doc.save(function(err,success){
          if(err){console.log(err)}
              res.status(200);
        })
      }
      else{
        var now = new Date();
        // make new entry
        short_story.count({fbid:req.query.fbid},function(err, count){
          console.log('making new')
          db_entry = new short_story({
          fbid:req.query.fbid,
          time:now.toISOString(),
          msgs:entry,
          num:0,
          doc_index:count
          })
        db_entry.save(function(err,success) {
          if(err) {console.log('err')}
              res.status(200);
        });          
        })

      }

    }
  });
  
  res.status(200);
  res.send()
  


});
router.get('/webhook', function(req, res, next) {
  
  var texts = req.query.msg.split('|')
  for (var i = 0, len = texts.length; i < len; i++) {
        texts[i] = '<p>'.concat(texts[i],'</p>')
  }
  if(req.query.header){
    head=req.query.header;
    var headerhtml = '<h2>'.concat(head,'</h2>')
    texts[0] = headerhtml.concat(texts[0])
  }
  
  var entry = texts.join('')
  var sendback = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Saved!",
        "buttons": [
          {
            "type": "web_url",
            "url": 'https://stansonweb.herokuapp.com/litby/geteditor?index=0&fbid='+req.query.fbid,
            "title": "View editor"
          },
        ]
      }
    }
  };

  if(req.query.freewrite){sendback.attachment.payload.buttons.push({
            "type": "show_block",
            "block_name": "Freewriting",
            "title": "Keep going"
          })}

  short_story.findOne({fbid:req.query.fbid,num:{"$lte":20,"$gte":0}},function(err,doc) {
    if(err){console.log(err)}
    else{
      console.log(doc)
      if(doc){
        console.log('updating')
        doc.msgs = doc.msgs.concat(entry)
        doc.num+=1
        doc.save(function(err,success){
          if(err){console.log(err)}
              console.log([sendback])
              res.json([sendback])
              res.status(200);
        })
      }
      else{
        var now = new Date();
        // make new entry
        short_story.count({fbid:req.query.fbid},function(err, count){
          console.log('making new')
          db_entry = new short_story({
          fbid:req.query.fbid,
          time:now.toISOString(),
          msgs:entry,
          num:0,
          doc_index:count
          })
        db_entry.save(function(err,success) {
          if(err) {console.log('err')}
              console.log([sendback])
              res.json([sendback])
              res.status(200);
        });          
        })

      }

    }
  });
  





});


module.exports = router;
