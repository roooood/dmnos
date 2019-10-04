
module.exports = function (orm, db) {
  var Points = db.define('points', {
    id: { type: 'serial', key: true },
    bet: { type: 'integer' },
    commission: { type: 'integer' },
    date: { type: 'date', required: true, time: true },
  },
    {
      hooks: {
        beforeValidation: function () {
          this.date = new Date();
        }
      }
    });
  Points.sync();
};
