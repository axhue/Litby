var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')

mongoose.connect('mongodb://admin:1234go@ds041939.mlab.com:41939/literarius')
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
var entry = mongoose.Schema({
    fbid: String,
    time: String,
    msg:Array,
    header:String,
    category:String
})
var short_story = mongoose.model('short_story',entry)
var novel = mongoose.model('novel',entry)
var wp_response = mongoose.model('wp_response',entry)
var short_form = mongoose.model('short_form',entry)
var long_form = mongoose.model('long_form',entry)
var headline_resp = mongoose.model('headline_resp',entry)
var categories = [short_story,novel];

function assemble_data(user_id,res){
    novel.find({fbid:user_id},function (err,docs){
            if (err){
                console.log(err)
            }
            else{
                //sort data by date
                function sortFactory(prop) {
                  return function(a,b){ return b[prop].localeCompare(a[prop]); };
                }
                res.render('editor', {docs:docs.sort(sortFactory('time'))});
            }
        });

}
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('editor', { title: 'Express' });
});

router.get('/geteditor', function(req, res, next) {
  assemble_data(req.query.fbid,res)
});
router.post('/savedb', function(req, res, next) {
    novel.findById(req.body.id,function(err,res){
        res.msg = req.body.data;
        res.save();
    })
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
            "url": 'https://stansonweb.herokuapp.com/litby/geteditor?fbid='+req.query.fbid,
            "title": "View editor"
          }
        ]
      }
    }
  };
  res.json(sendback)
  res.status(200);
  res.send();
  


});
router.get('/webhook', function(req, res, next) {
  var now = new Date();
  texts = req.query.msg.split('|')
  if(req.query.head){head=req.query.head;}
  else{head='Untitled';}
  var header = '<h2>'.concat(head,'</h2>')
  texts[0] = header.concat(texts[0])
  if (req.query.category === 'novel'){
    db_entry = new novel({
        fbid:req.query.fbid,
        time:now.toISOString(),
        msg:texts

    })
  }
  if (req.query.category === 'short_story'){
    db_entry = new novel({
        fbid:req.query.fbid,
        time:now.toISOString(),
        msg:texts
    })
  }
  db_entry.save(function(err,success) {
    if(err) {console.log('err')}
    console.log(success)
  })
  var sendback = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "saved!",
        "buttons": [
          {
            "type": "web_url",
            "url": 'https://stansonweb.herokuapp.com/litby/geteditor?fbid='+req.query.fbid,
            "title": "View in editor"
          }
        ]
      }
    }
  };
  res.json(sendback)
  res.status(200);
  res.send();
  


});


module.exports = router;
