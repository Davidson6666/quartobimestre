const bcrypt = require('bcryptjs');
bcrypt.hash('admfodao1509', 12, (err, hash) => {
  console.log(hash);
});