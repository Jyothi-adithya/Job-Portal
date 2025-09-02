const bcrypt = require('bcrypt');
const hash = '$2b$10$zBY.Ew8wTxY4lfnCIByQSOovDL3ome4HR86lXW1C8kRk9LKRt1reO';
bcrypt.compare('Rsst12345', hash, (err, result) => {
    if (err) throw err;
    console.log('Password match:', result);
});