var _ = require('lodash');
var helpers = require('./_helpers');
var jwt = require('jsonwebtoken');
var settings = require('../../config/settings');
var request = require('request');

module.exports = {
  list: function (req, res, next) {
    req.models.user.find().limit(4).order('-id').all(function (err, messages) {
      if (err) return next(err);

      var items = messages.map(function (m) {
        return m.serialize();
      });

      res.send({ items: items });
    });
  },
  create: function (req, res, next) {
    let userResponse = _.pick(req.body, 'captcha');
    var verificationUrl = settings.google.ref + "secret=" + settings.google.secret + "&response=" + userResponse.captcha;
    request(verificationUrl, function (error, response, body) {
      body = JSON.parse(body);
      if (body.success !== undefined && !body.success) {
        return res.json({ success: false, errors: { captcha: ["به نظر میرسد که شما ربات هستید"] } });
      }
      let params = _.pick(req.body, 'name', 'family', 'email', 'phone', 'username', 'password');
      req.models.user.create(params, function (err, user) {
        if (err) {
          if (Array.isArray(err)) {
            return res.send({ success: false, errors: helpers.formatErrors(err) });
          } else {
            return next(err);
          }
        }
        let token = jwt.sign({ id: user.id }, settings.privateKey);
        req.models.user.get(user.id, function (err, newUser) {
          newUser.token = token;
          newUser.save();
        });
        return res.send({ success: true, token: token });
      });
    });




  },
  get: function (req, res, next) {

  }
};
