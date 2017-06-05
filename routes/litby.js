var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')
var moment = require('moment-timezone');


var db_uri = process.env.DB_URI
mongoose.connect(db_uri)
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

// writing a new entry in notebook
var entry = mongoose.Schema({
    fbid: String,
    time: String,
    msgs:String,
    category:String,
    num: Number,
    doc_index:Number
})

//Send a key to webhook using chatfuel json bloack, the entry will be saved into the notebook
// a custom response will be sent
var response_schema = mongoose.Schema({
  key: String,
  response: Object

})

// store 
var user_var_schema = mongoose.Schema({
  fbid: String,
  vars:Array
  // an array of JSON in format : {var_name:"name",
  // score:number,
  // last_edit:timestamp}
  
})

// defined var_names and rewards
var rewards_schema = mongoose.Schema({
  var_name:String,
  rewards:Array
})


var rewards = mongoose.model('rewards',rewards_schema)
var user_var = mongoose.model('user_var',user_var_schema)
var json_response = mongoose.model('json_responses',response_schema)
var short_story = mongoose.model('short_story',entry)
var novel = mongoose.model('novel',entry)
var wp_response = mongoose.model('wp_response',entry)
var short_form = mongoose.model('short_form',entry)
var long_form = mongoose.model('long_form',entry)
var headline_resp = mongoose.model('headline_resp',entry)
var categories = [short_story,novel];


function get_reward(req,res,score){
  console.log('getting rewards')
    rewards.findOne({var_name:req.query.var},function(err,reward_doc){

    if(!reward_doc){

            console.log('ERROR: Reward is not found for var_name: ' + req.query.var)
          }

          else{
            //continue onwards!
            reward_doc.rewards.forEach(function(item){
              if (score == item.required){
                console.log(item.json_response)
                res.json(item.json_response)
                }
              })

          }


      })

}

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


// 2 parameters: fbid, var_name(the name of user var)
function reset_score(fbid,var_name,inc){
  user_var.findOne({fbid:fbid},function(err,doc){
    // now look for variable in user profile
    console.log(doc)
    if(err){console.log(err)}

    if(doc){
      var found;
      doc.vars.forEach(function(item,index){
      if(var_name == item.var_name){
        found = true;

        //remove json from array
        doc.vars.splice(index,1);
        console.log('UPDATED:')
        console.log(doc.vars)
        doc.save(function(err,success){
          if(err){console.log(err)}
        })
        }
      })
      // variable not found
      if(!found){console.log("ERROR: can't reset unfound variable for user: "+req.query.fbid)}
      
      // document not found
      if(!doc){
        
        new_user = new user_var({
          fbid:req.query.fbid,
          vars:[]
        })

        new_user.save()

      }    

    }

  })
}
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('wrong', { title: 'Express' });
});

router.get('/geteditor', function(req, res, next) {
  assemble_data(req,res,req.query.count)
});
router.post('/savedb', function(req, res, next) {
  if (req.body.id === 'new_entry'){
    var now = moment().tz('UTC').format();
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


//pull a JSON FB msgr template from database and replace and add the fbid to make url point to user's editor
router.get('/jsoneditor', function(req, res, next) {
    var key=req.query.key
    json_response.findOne({key:key},function(err,doc){
              if(doc){
              var old = JSON.stringify(doc.response).replace(/%%fbid%%/g,req.query.fbid)
              var newer = JSON.parse(old)
              res.json([newer])
            }
              })
  
});



router.get('/test',function (req,res,next){
  key = req.query.key
  console.log(key)
  json_response.findOne({key:key},function(err,doc){
    console.log(doc)
    var old = JSON.stringify(doc.response).replace(/%%fbid%%/g,'YOOOOOO')
    var newer = JSON.parse(old)
    res.json(newer)
  })
});

// 4 parameters : fbid,fb_tz,var_name and increment to apply to var
router.get('/score',function (req,res,next){
    console.log(req.query)
    user_var.findOne({fbid:req.query.fbid},function(err,doc){

    if(err){console.log(err)}
    if(doc){
      // check if their update has been in the last 24 hours
      var found;
      doc.vars.forEach(function(item,index){
        if(item.var_name == req.query.var){
          found = true;

          // get time at user's location
          offset = parseInt(req.query.fb_tz)

          //round user time to beginning of day
          user_time = moment().tz('UTC').add(offset,'hour')
          rounded_usr = user_time.clone().startOf('day')

          //round last edit time to start of the day
          last_edit = moment(item.last_edit).tz('UTC').startOf('day')

          // time compare only counts a day if there is a difference of 24 hours
          // which is why we round datetime to beginning of day so there is 
          // a 24 difference betweed daily entries
          time_compare = rounded_usr.diff(last_edit,'day')
          if(time_compare <= 1){
            //update score tally and last_edit date
            console.log('Streak Added')
            doc.vars.set(index,{
              var_name:req.query.var,
              last_edit:user_time.format(), //change to address user timezone
              score:parseInt(item.score)+parseInt(req.query.inc)})
            //local store user score for getting rewards
            score = doc.vars[index]
          }

          else{
            console.log('Streak Broken')
            doc.vars.set(index,{
              var_name:req.query.var,
              last_edit:user_time.format(), //change to address user timezone
              score:parseInt(req.query.inc)})
            score = doc.vars[index]
              
          }
        }
      });

      if(!found){
        //create new entry

        //get time in user's location
        offset = parseInt(req.query.fb_tz)
        user_time = moment().tz('UTC').add(offset,'hour')

        // create new user variable
        new_var = {
          var_name:req.query.var,
          score:req.query.inc,
          last_edit: user_time.format()
        }
        //local store user score for getting rewards
        score = req.query.inc
        doc.vars.push(new_var)
      }
    doc.save(function(err,success){
        if(err){console.log(err)}
        if(success){

        console.log('Score change accepted: ' + success)
        //return a response if the a reward is triggered
        get_reward(req,res,score)

        }
      });
      }

     //user not found 
    if(!doc){
      console.log('User profile '+req.query.fbid +' not found, creating new')

      offset = parseInt(req.query.fb_tz)
      user_time = moment().tz('UTC').add(offset,'hour')
      // create new user variable
      new_var = {
        var_name:req.query.var,
        score:req.query.inc,
        last_edit: user_time.format()
      }
      //local store user score for getting rewards
      var new_user = new user_var({
        fbid:req.query.fbid,
        last_edit: new Date(),
        vars:[new_var]
      })
      new_user.save()
    }

    })

  });

// 2 parameters: fbid, var(the name of user var)
router.get('/reset_score',function(req,res,next){
  console.log(req.query)
  
  user_var.findOne({fbid:req.query.fbid},function(err,doc){
    // now look for variable in user profile
    console.log(doc)
    if(err){console.log(err)}

    if(doc){
      var found;
      doc.vars.forEach(function(item,index){
      if(req.query.var == item.var_name){
        found = true;
        //remove json from array
        doc.vars.splice(index,1);
        console.log('UPDATED:')
        console.log(doc.vars)
        doc.save(function(err,success){
          if(err){console.log(err)}
        })
        }
      })
      // variable not found
      if(!found){console.log("ERROR: can't reset unfound variable for user: "+req.query.fbid)}
      
      // document not found
      if(!doc){
        
        new_user = new user_var({
          fbid:req.query.fbid,
          vars:[]
        })

        new_user.save()

      }    

    }

  })
});

// webhook endpoint for chatfuel
router.get('/webhook', function(req, res, next) {
  console.log(req.query.msg)
  texts = req.query.msg
  if(!Array.isArray(texts)){
    texts=[texts]
  }


  for (var i = 0, len = texts.length; i < len; i++) {
        texts[i] = '<p>'.concat(texts[i],'</p>')
  }
  if(req.query.header){
    head=req.query.header;
    headerhtml = '<h2>'.concat(head,'</h2>')
    texts[0] = headerhtml.concat(texts[0])
  }
  entry = texts
  if (Array.isArray(texts)){
    entry = texts.join('')
  }
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
              var key = req.query.key
              json_response.findOne({key:key},function(err,doc){
              if(doc){
              var old = JSON.stringify(doc.response).replace(/%%fbid%%/g,req.query.fbid)
              var newer = JSON.parse(old)
              console.log(newer)
              res.json([newer])
            }
              })
        })
      }
      else{
        var now = moment().tz('UTC').format();
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
            var key = req.query.key
             json_response.findOne({key:key},function(err,doc){
              if (doc){
              var old = JSON.stringify(doc.response).replace(/%%fbid%%/g,req.query.fbid)
              var newer = JSON.parse(old)
              res.json([newer])
            }
          })
        });          
        })

      }

    }
  });
  





});
module.exports = router;