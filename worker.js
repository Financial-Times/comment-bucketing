"use strict";

var jackrabbit = require('jackrabbit');
var livefyre = require('livefyre');
var Stream = require('./src/stream.js');
var bucketing = require('./src/bucketing.js');
var tagContent = require('./src/tagContent.js');
var config = require('./config.js');
var events = require('./src/events.js');
var persistentVariables = require('./src/persistentVariables');
var metrics = require('./src/metrics.js');

var network = livefyre.getNetwork(config.networkName, config.networkSecret);
var networkUrn = network.getUrn();

var stream = new Stream({
	lastEventId: 0,
	networkName: network.getNetworkName(),
	resource: networkUrn,
	callback: function (data) {
		var bucket = bucketing.next();
		tagContent.tag(data.collectionId, data.comment.commentId, 'bucket' + bucket);
	}
});


var health = {};
events.on('health', function (healthData) {
	var keys = Object.keys(healthData);
	var key;
	var item;

	for (var i = 0; i < keys.length; i++) {
		key = keys[i];
		item = healthData[key];

		if (!health[key] || item.ok !== health[key].ok) {
			health[key] = item;
		}
	}
});



var init = function () {
	stream.init();

	var queue = jackrabbit(config.rabbitUrl);
	queue.on('connected', function() {
		queue.create('health', {}, function () {
			queue.create('health_update', function () {
				var emitHealth = function () {
					queue.publish('health', health);
				};

				queue.handle('health_update', function (data, ack) {
					emitHealth();
					ack();
				});
			});
		});
	});


	setInterval(function () {
		persistentVariables.set('no_of_comments', metrics.noOfComments);
		persistentVariables.set('stream_errors', metrics.streamErrors);
	}, 10000);
};


persistentVariables.connect(function (err, connection) {
	if (err) {
		events.emit('health', {
			postgresql_connection: {
				name: "PostreSQL connection",
				lastUpdated: new Date().toISOString(),
				ok: false,
				technicalSummary: "PostreSQL on heroku is down.",
				severity: 3,
				businessImpact: "Streaming of comments is down, so they cannot be tagged with bucket numbers. Impact only on moderators. No impact on end users.",
				checkOutput: err,
				panicGuide: "http://comment-bucketing.herokuapp.com/troubleshoot",
			}
		});
		return;
	}

	events.emit('health', {
		postgresql_connection: {
			name: "PostreSQL connection",
			lastUpdated: new Date().toISOString(),
			ok: true
		}
	});

	var doneNr = 0;
	var done = function () {
		doneNr++;

		if (doneNr >= 6) {
			init();
		}
	};

	persistentVariables.get('bucket_number', function (err, bucketNumber) {
		if (!err && bucketNumber) {
			bucketing.currentBucket = bucketNumber;
		}

		done();
	});

	persistentVariables.get('bucket_index', function (err, bucketIndex) {
		if (!err && bucketIndex) {
			bucketing.itemInBucket = bucketIndex;
		}

		done();
	});

	persistentVariables.get('last_event_id', function (err, lastEventId) {
		if (!err && lastEventId) {
			stream.setLastEventId(lastEventId);
		}

		done();
	});

	persistentVariables.get('last_comment_id', function (err, lastCommentId) {
		if (!err && lastCommentId) {
			stream.setLastCommentId(lastCommentId);
		}

		done();
	});

	persistentVariables.get('no_of_comments', function (err, noOfComments) {
		if (!err && noOfComments) {
			metrics.noOfComments = noOfComments;
		}

		done();
	});

	persistentVariables.get('stream_errors', function (err, streamErrors) {
		if (!err && streamErrors) {
			metrics.streamErrors = streamErrors;
		}

		done();
	});
});
