"use strict";

var request = require('request');
var bearerToken = require('./bearerToken.js');
var events = require('./events.js');
var persistentVariables = require('./persistentVariables.js');
var metrics = require('./metrics.js');

function Stream (config) {
	var callbacks = [];
	var lastEventId = 0;
	var lastCommentId = 0;

	var initialized = false;
	var destroyed = false;

	if (config.callbacks && config.callbacks instanceof Array) {
		callbacks = config.callbacks;
	}
	if (config.callback && typeof config.callback === 'function') {
		callbacks.push(config.callback);
	}

	if (typeof config.lastEventId !== 'undefined') {
		lastEventId = config.lastEventId;
	}

	if (typeof config.lastCommentId !== 'undefined') {
		lastCommentId = config.lastCommentId;
	}

	if (!config.networkName) {
		return;
	}

	if (!config.resource) {
		return;
	}


	var callAllCallbacks = function () {
		var i;
		var args = arguments;

		var callCallback = function (currentCallback) {
			setTimeout(function () {
				currentCallback.apply(this, args);
			});
		};

		for (i = 0; i < callbacks.length; i++) {
			callCallback(callbacks[i]);
		}
	};

	var handleNewComment = function (data, authorData) {
		lastCommentId = data.content.id;
		persistentVariables.set('last_comment_id', lastCommentId);

		metrics.noOfComments++;

		callAllCallbacks({
			collectionId: data.collectionId,
			comment: {
				parentId: data.content.parentId || null,
				author: authorData ? {
					displayName: authorData.displayName,
					tags: authorData.tags,
					type: authorData.type
				} : null,
				content: data.content.bodyHtml || null,
				timestamp: data.content.createdAt || null,
				commentId: data.content.id || null,
				visibility: data.vis
			}
		});
	};

	var handleResponseData = function (data) {
		if (data.states) {
			var eventCollection = data.states;

			for (var key in eventCollection) {
				if (eventCollection.hasOwnProperty(key)) {
					var item = eventCollection[key];

					// type: comment
					if (item.type === 0) {
						if (item.content.id > lastCommentId) {
							handleNewComment(item, ((data.authors && item.content.authorId) ? data.authors[item.content.authorId] : null));
						}
					}
				}
			}
		}
	};


	function connect () {
		if (destroyed) {
			return;
		}

		var lastTime = new Date();
		var timeToWait = 0;
		var aborted = false;

		var lfStreamUrl = 'http://'+ config.networkName +'.bootstrap.fyre.co/api/v3.1/activity/?resource='+ config.resource +'&since=' + lastEventId;

		var backupRestart = setTimeout(function () {
			aborted = true;

			restartConnection({
				force: true
			});
		}, 30000);

		var restartConnection = function (options) {
			options = options || {};

			clearTimeout(backupRestart);

			if (!aborted || options.force === true) {
				aborted = true;

				if (options.error) {
					metrics.streamErrors++;

					events.emit('health', {
						lf_activityStream: {
							name: "Livefyre API - activity stream",
							ok: false,
							technicalSummary: options.reason,
							severity: 3,
							businessImpact: "Streaming of comments is down, so they cannot be tagged with bucket numbers. Impact only on moderators. No impact on end users.",
							checkOutput: options.error,
							panicGuide: "http://comment-bucketing.herokuapp.com/troubleshoot",
							lastUpdated: new Date().toISOString()
						}
					});
					console.error('Error: ', options.reason, options.error, options.details);
				} else {
					events.emit('health', {
						lf_activityStream: {
							name: "Livefyre API - activity stream",
							ok: true,
							lastUpdated: new Date().toISOString()
						}
					});
				}

				timeToWait = 10000 - (new Date() - lastTime);

				setTimeout(function () {
					connect();
				}, (timeToWait < 0 ? 0 : timeToWait));
			}
			return;
		};

		try {
			request.get(lfStreamUrl, {
				'auth': {
					'bearer': bearerToken.get()
				}
			}, function (error, response, body) {
				if (error) {
					restartConnection({
						error: error,
						reason: 'Connection error'
					});
					return;
				}

				if (!response || response.statusCode !== 200) {
					restartConnection({
						error: response.statusCode,
						reason: 'Status code: ' + response.statusCode
					});
					return;
				}

				try {
					if (body) {
						var bodyJson = JSON.parse(body);

						if (bodyJson && bodyJson.data) {
							handleResponseData(bodyJson.data);

							lastEventId = bodyJson.data && bodyJson.data.meta && bodyJson.data.meta.cursor && bodyJson.data.meta.cursor.next ? bodyJson.data.meta.cursor.next :
										bodyJson.meta && bodyJson.meta.cursor && bodyJson.meta.cursor.next ? bodyJson.meta.cursor.next : lastEventId;

							persistentVariables.set('last_event_id', lastEventId);
						}
					}

					restartConnection();
				} catch (e) {
					restartConnection({
						error: e,
						reason: 'Exception: Response parse error',
						details: {
							statusCode: response.statusCode,
							body: body
						}
					});
				}
			});
		} catch (e) {
			restartConnection({
				error: e,
				reason: 'Exception: Call'
			});
		}
	}

	this.setLastEventId = function (eventId) {
		lastEventId = eventId;
	};

	this.setLastCommentId = function (commentId) {
		lastCommentId = commentId;
	};

	this.addCallback = function (callback) {
		callbacks.push(callback);
	};

	this.init = function () {
		if (!initialized && !destroyed) {
			initialized = true;
			connect();

			return true;
		} else {
			return false;
		}
	};

	this.destroy = function () {
		callbacks = null;
		lastEventId = null;

		destroyed = true;
	};
}

module.exports = Stream;
