"use strict";

var metrics = require('./src/metrics.js');
var jackrabbit = require('jackrabbit');
var express = require('express');
var app = express();

var server = require('http').Server(app);

var config = require('./config.js');
var defaultHealth = require('./defaultHealth.json');
var persistentVariables = require('./src/persistentVariables.js');


app.use(express.static(__dirname + '/static'));


var rebuildHealth = function () {
	lastUpdated = new Date();

	health.checks = [];
	gtg = true;

	health.checks.push(checks.workerThread);

	if (checks.workerThread && checks.workerThread.ok) {
		var keys = Object.keys(workerChecks);
		var key;
		var item;

		for (var i = 0; i < keys.length; i++) {
			key = keys[i];
			item = workerChecks[key];

			health.checks.push(item);

			if (!item.ok) {
				gtg = false;
			}
		}
	} else {
		gtg = false;
	}
};



var lastUpdated = new Date();

var health = defaultHealth;

var workerCheckName = "Worker process which continously listens on the Livefyre activity stream.";
var workerThreadNormalInfo = {
	name: workerCheckName,
	ok: true,
	lastUpdated: new Date().toISOString()
};
var workerThreadFailInfo = {
	name: workerCheckName,
	ok: false,
	technicalSummary: "Worker process of the application is not accessible.",
	severity: 3,
	businessImpact: "The automatic tagging of comments is not working, so that moderators cannot effectively split their work, but moderation is still possible. Impact only on moderators. No impact on end users.",
	checkOutput: "No connection with the worker process. It may need a restart.",
	panicGuide: "http://comment-bucketing.herokuapp.com/troubleshoot",
	lastUpdated: new Date().toISOString()
};

var checks = {
	workerThread: workerThreadFailInfo
};
var workerChecks = {};
var gtg = false;

rebuildHealth();

server.listen(process.env.PORT || 80);



var timeout;
var interval;

var queue = jackrabbit(config.rabbitUrl);
queue.on('connected', function() {
	checks.workerThread = workerThreadNormalInfo;
	checks.workerThread.lastUpdated = new Date().toISOString();

	queue.create('health', {}, function () {
		queue.create('health_update', function () {
			queue.handle('health', function (healthData, ack) {
				workerChecks = healthData;
				checks.workerThread = workerThreadNormalInfo;
				checks.workerThread.lastUpdated = new Date().toISOString();

				clearTimeout(timeout);

				rebuildHealth();
				ack();
			});

			var checkForWorkerChecks = function () {
				queue.publish('health_update', {});

				timeout = setTimeout(function () {
					checks.workerThread = workerThreadFailInfo;
					checks.workerThread.lastUpdated = new Date().toISOString();

					rebuildHealth();
				}, 10000);
			};

			interval = setInterval(checkForWorkerChecks, 15000);
			checkForWorkerChecks();
		});
	});
});

queue.on('disconnect', function () {
	clearInterval(interval);
	clearTimeout(timeout);

	checks.workerThread = workerThreadFailInfo;
	checks.workerThread.lastUpdated = new Date().toISOString();

	rebuildHealth();
});




app.get('/', function (req, res) {
	res.redirect('/docs.html');
});

app.get('/troubleshoot', function (req, res) {
	res.redirect('/troubleshoot.md');
});


var healthHandler = function (req, res) {
	res.append('Last-Modified', lastUpdated.toGMTString());
	res.append('Cache-control', 'no-cache');

	res.json(health);
};
app.get('/__health', healthHandler);
app.get('/__health.json', healthHandler);

app.get('/__gtg', function (req, res) {
	res.append('Cache-control', 'no-cache');

	if (gtg) {
		res.send();
	} else {
		res.status(503);
		res.send();
	}
});

app.get('/__about', function (req, res) {
	res.json({
		"name": "comment-bucketing",
		"versions": [
			"http://comment-bucketing.herokuapp.com"
		]
	});
});


var fetchMetrics = function () {
	persistentVariables.connect(function (err) {
		if (err) {
			return;
		}

		persistentVariables.get('no_of_comments', function (err, noOfComments) {
			if (!err && noOfComments) {
				metrics.noOfComments = noOfComments;
			}
		});

		persistentVariables.get('stream_errors', function (err, streamErrors) {
			if (!err && streamErrors) {
				metrics.streamErrors = streamErrors;
			}
		});
	});
};
fetchMetrics();
setInterval(fetchMetrics, 15000);

app.get('/__metrics', function (req, res) {
	res.json({
		no_of_comments: parseInt(metrics.noOfComments, 10),
		stream_errors: parseInt(metrics.streamErrors, 10)
	});
});
