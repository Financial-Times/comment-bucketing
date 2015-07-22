"use strict";

var config = require('../config.js');
var authToken = require('./authToken.js');
var request = require('request');
var events = require('./events.js');

var livefyre = require('livefyre');
var network = livefyre.getNetwork(config.networkName, config.networkSecret);



var report = function (options) {
	if (options && options.error) {
		events.emit('health', {
			lf_tagComment: {
				name: "Livefyre API - tag comments",
				ok: false,
				technicalSummary: options.reason,
				severity: 3,
				businessImpact: "The automatic tagging of comments is not working, so that moderators cannot effectively split their work, but moderation is still possible. Impact only on moderators. No impact on end users.",
				checkOutput: options.error,
				panicGuide: "http://comment-bucketing-prod.herokuapp.com/troubleshoot",
				lastUpdated: new Date().toISOString()
			}
		});
	} else {
		events.emit('health', {
			lf_tagComment: {
				name: "Livefyre API - tag comments",
				ok: true,
				lastUpdated: new Date().toISOString()
			}
		});
	}
};

exports.tag = function (collectionId, messageId, tagName) {
	request.post('https://'+ network.getNetworkName() +'.quill.fyre.co/api/v3.0/collection/'+ collectionId +'/tag/'+ messageId +'/?'+
		'tag_name='+ tagName + '&lftoken='+ authToken.get(), function (error, response, body) {
			if (error) {
				report({
					error: error,
					reason: 'Connection error'
				});
				return;
			}

			if (!response || response.statusCode !== 200) {
				report({
					error: response.statusCode,
					reason: 'Status code: ' + response.statusCode
				});
				return;
			}

			report();
		});
};
