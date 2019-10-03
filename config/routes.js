var settings = require('./settings');
var controllers = require('../app/controllers')
var colyseus = require('colyseus');
var http = require('http')
var ServerIO = require('../server')

module.exports = function (app) {

  var server = http.createServer(app)
  var gameServer = new colyseus.Server({ server: server })
  gameServer.register('domino', ServerIO)
  server.listen(settings.port)

  var checkLogin = function (req, res, next) {
    if (req.user)
      next();
    else
      res.send({ success: false, message: "login need" })
  };
  app.get('/', controllers.home);
  app.post('/user/register', controllers.user.create);
  // app.post('/user/login', checkLogin, controllers.user.login);
  app.post('/user/login', controllers.user.login);
};
