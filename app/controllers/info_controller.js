var _ = require('lodash');
var helpers = require('./_helpers');

function userInfo(user) {
  return {
    name: user.fullName(),
    username: user.username,
    token: user.token,
    balance: user.balance,
  }
}
module.exports = {
  tops: function (req, res, next) {
    req.models.user.find().limit(10).order('-win').all((err, messages) => {
      let win = messages.map(m => {
        return {
          id: m.id,
          name: m.fullName(),
        };
      });
      req.models.user.find().limit(10).order('-lose').all((err, messages) => {
        let lose = messages.map(m => {
          return {
            id: m.id,
            name: m.fullName(),
          };
        });
        req.models.user.find().limit(10).order('-totalGame').all((err, messages) => {
          let total = messages.map(m => {
            return {
              id: m.id,
              name: m.fullName(),
            };
          });
          res.send({ win, lose, total });
        });
      });
    });
  },
};
