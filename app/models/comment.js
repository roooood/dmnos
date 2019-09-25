

module.exports = function (orm, db) {
  var Comment = db.define('comment', {
    body: { type: 'text', required: true },
    createdAt: { type: 'date', required: true, time: true }
  },
    {
      hooks: {
        beforeValidation: function () {
          this.createdAt = new Date();
        }
      },
      validations: {
        body: orm.enforce.ranges.length(1, 1024)
      },
      methods: {
        serialize: function () {
          return {
            body: this.body,
          }
        }
      }
    });

  Comment.hasOne('message', db.models.message, { required: true, reverse: 'comments', autoFetch: true });
};
