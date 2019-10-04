var _ = require('lodash');
var helpers = require('./_helpers');
var jwt = require('jsonwebtoken');
var settings = require('../../config/settings');
var request = require('request');
var md5 = require('md5');

function userInfo(user) {
  return {
    name: user.fullName(),
    username: user.username,
    token: user.token,
    balance: user.balance,
  }
}
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
        let params = _.pick(req.body, 'captcha');
        var verificationUrl = settings.google.ref + "secret=" + settings.google.secret + "&response=" + params.captcha;
        request(verificationUrl, function (error, response, body) {
          body = JSON.parse(body);
          if (body.success !== undefined && !body.success) {
            newUser.remove();
            return res.json({ success: false, errors: { captcha: ["به نظر میرسد که شما ربات هستید"] } });
          } else {
            newUser.password = md5(newUser.password);
            newUser.token = token;
            newUser.save();
            return res.send({ success: true, data: userInfo(newUser) });
          }
        });
      });
    });
  },
  login: function (req, res, next) {
    let params = _.pick(req.body, 'username', 'password');
    params.password = md5(params.password);
    req.models.user.find(params, 1, function (err, user) {
      if (user == null) {
        return res.json({ success: false, errors: { data: ["نام کاربری یا کلمه عبور اشتباه است"] } });
      }
      user[0].lastSeen = new Date();
      user[0].save();
      let params = _.pick(req.body, 'captcha');
      var verificationUrl = settings.google.ref + "secret=" + settings.google.secret + "&response=" + params.captcha;
      request(verificationUrl, function (error, response, body) {
        body = JSON.parse(body);
        if (body.success !== undefined && !body.success) {
          return res.json({ success: false, errors: { captcha: ["به نظر میرسد که شما ربات هستید"] } });
        } else {
          return res.send({ success: true, data: userInfo(user[0]) });
        }
      });
    });
  },
  info: function (req, res, next) {
    req.models.user.get(req.user.id, function (err, user) {
      if (err != null) {
        return res.json({ success: false });
      }
      return res.send({ success: true, data: userInfo(user) });
    })
  }
};
