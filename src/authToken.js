"use strict";

var config = require('../config.js');
var livefyre = require('livefyre');

var network = livefyre.getNetwork(config.networkName, config.networkSecret);

var expires = null;
var token = null;

exports.get = function () {
	if (!expires || !token || new Date().getTime() >= expires) {
		expires = new Date(new Date().getTime() + 60 * 60 * 1000).getTime();

		token = network.buildUserAuthToken('system', 'system', 60 * 60);
	}

	return token;
};
