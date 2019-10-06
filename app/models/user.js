
module.exports = function (orm, db) {
  var User = db.define('user', {
    id: { type: 'serial', key: true },
    name: { type: 'text', required: true },
    family: { type: 'text', required: true },
    email: { type: 'text', required: true, unique: true },
    phone: { type: 'text', required: true, unique: true },
    username: { type: 'text', required: true, unique: true },
    password: { type: 'text', required: true },
    token: String,
    balance: { type: 'integer' },
    win: { type: 'integer' },
    lose: { type: 'integer' },
    totalGame: { type: 'integer' },
    joinedAt: { type: 'date', required: true, time: true },
    lastSeen: { type: 'date', required: true, time: true },
    status: Boolean
  },
    {
      hooks: {
        beforeValidation: function () {
          this.joinedAt = new Date();
          this.lastSeen = new Date();
          this.status = true;
          this.balance = 0;
          this.win = 0;
          this.lose = 0;
          this.totalGame = 0;
        }

      },
      validations: {
        name: [
          orm.enforce.notEmptyString("خالی است"),
        ],
        family: [
          orm.enforce.notEmptyString("خالی است"),
        ],
        email: [
          orm.enforce.patterns.email("ایمیل نادرست است"),
          orm.enforce.unique("تکراری است")
        ],
        phone: [
          orm.enforce.notEmptyString("خالی است"),
          orm.enforce.ranges.length(11, 11, "نادرست است"),
          // orm.enforce.ranges.number(1, undefined, "نادرست است"),
          orm.enforce.unique("تکراری است")
        ],
        username: [
          orm.enforce.security.username({ length: 4 }, 'نادرست است'),
          orm.enforce.unique("تکراری است")
        ],
        password: [
          orm.enforce.security.password('6', 'نارست است')
        ],
      },
      methods: {
        fullName: function () {
          return this.name + ' ' + this.family;
        },
        serialize: function () {
          return {
            id: this.id,
            name: this.name,
            family: this.family,
            email: this.email,
            phone: this.phone,
            username: this.username,
            joinedAt: this.joinedAt,
            win: this.win,
            lose: this.lose,
            totalGame: this.totalGame,
            lastSeen: this.lastSeen,
            balance: this.balance,
            status: this.status,
          };
        }
      }
    });
  User.sync();
};
