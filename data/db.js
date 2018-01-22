var Sequelize = require("sequelize");
var sequelize = new Sequelize("telegram_cinematica", "root", "12345", {
	host: '127.0.0.1',
    dialect: "mysql",
});

var user = sequelize.define("user", {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	userId: Sequelize.INTEGER,
	stage: {
		type: Sequelize.INTEGER,
	    defaultValue: 0
    }
    //TIME CHOICE
	//CINEMA CHOICE
	//ROW CHOICE
	//SEAT CHOICE 
})

user.sync().then(function() {});



module.exports = user;