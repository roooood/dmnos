
module.exports = function (orm, db) {
  var Results = db.define('results', {
    id: { type: 'serial', key: true },
    type: ['win', 'lose'],
  });
  Results.hasOne('points', db.models.points, { required: true, autoFetch: true });
  Results.hasOne('user', db.models.user, { required: true, autoFetch: true });
  Results.sync();
};
