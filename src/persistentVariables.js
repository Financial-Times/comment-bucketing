"use strict";

var pg = require('pg');
var config = require('../config.js');
var Queue = require('./queue.js');

var connString = config.databaseUrl;

var error;
var connection;

var queues = {};


exports.get = function (name, callback) {
	if (connection) {
		connection.query('SELECT * FROM variables WHERE name = $1', [name], function(err, result) {
			if (err) {
				callback(err, null);
				return;
			}

			if (result && result.rows && result.rows[0] && result.rows[0].value) {
				callback(null, parseInt(result.rows[0].value, 10));
			} else {
				callback(new Error("Not found"));
			}
		});
	} else {
		callback(new Error("No connection."));
	}
};


var _set = function (name, value, callback) {
	connection.query("UPDATE variables SET value = $1 WHERE name = $2", [value, name], function (updateErr, result) {
		if (updateErr || result.rowCount === 0) {
			connection.query("INSERT INTO variables (name, value) VALUES ($1, $2)", [name, value], function (insertErr) {
				if (insertErr) {
					callback(insertErr);
					return;
				}

				callback();
			});
			return;
		}

		callback();
	});
};

exports.set = function (name, value, callback) {
	if (connection) {
		if (!queues[name]) {
			queues[name] = new Queue();
		}

		queues[name].push(function (done) {
			_set(name, value, function (err) {
				done();

				if (callback) {
					callback(err);
				}
			});
		});
	} else {
		callback(new Error("No connection."));
	}
};

exports.connect = function (callback) {
	if (!connection) {
		pg.connect(connString, function(err, client, done) {
			if (err) {
				error = err;
				callback(err);
				return;
			}

			connection = client;

			callback(null, connection);
		});
	} else {
		callback(null, connection);
	}
};
