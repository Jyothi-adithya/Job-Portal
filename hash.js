const bcrypt = require('bcrypt');
bcrypt.hash('Rsst12345', 10, (err, hash) => {
  if (err) throw err;
  console.log(hash);
});