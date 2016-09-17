var Sequelize = require('sequelize');

var connectionString = ''; 

var sequelize = new Sequelize(connectionString, {
  native: true
});

module.exports = sequelize;



// Example URI connection string using Postgres on Heroku. 
// 'postgres://faewxhnjoycbfp:DtOoHz90kYFSHDTNz99oIu9rig@ec2-54-243-249-173.compute-1.amazonaws.com:5432/deonuij9227b80'
