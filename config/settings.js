var path = require('path');

var settings = {
  path: path.normalize(path.join(__dirname, '..')),
  port: process.env.NODE_PORT || 2657,
  privateKey: 'my private key',
  google: {
    ref: 'https://www.google.com/recaptcha/api/siteverify?',
    secret: '6LdIWasUAAAAAD5NV6JP4LQX-n3de2gNvsKa0ZPF'
  },
  database: {
    protocol: "mysql", // or "mysql"
    query: { pool: true },
    host: "localhost",
    database: "domino",
    user: "root",
    password: ""
  }
};

module.exports = settings;
