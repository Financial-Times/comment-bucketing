"use strict";

var config = require('../config.js');
var jwt = require('jwt-simple');
var livefyre = require('livefyre');

var network = livefyre.getNetwork(config.networkName, config.networkSecret);
var networkUrn = network.getUrn();

var expires = null;
var token = null;

exports.get = function () {
	if (!expires || !token || new Date().getTime() >= expires) {
		expires = new Date(new Date().getTime() + 60 * 60 * 1000).getTime();

		var authData = {
			iss: networkUrn,
			aud: networkUrn,
			sub: networkUrn,
			scope: 'urn:livefyre:api:core=GetActivityStream',
			exp: expires
		};

		token = jwt.encode(authData, config.networkSecret);
	}

	return token;
};
