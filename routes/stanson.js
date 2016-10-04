var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('stanson')
});

router.get('/privacy', function(req, res, next) {
  res.render('privacy')
});

module.exports = router;
