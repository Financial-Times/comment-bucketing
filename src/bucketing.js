"use strict";

var config = require('../config.js');
var persistentVariables = require('./persistentVariables.js');

exports.currentBucket = 1;
exports.itemInBucket = 0;
exports.next = function () {
	exports.itemInBucket++;

	if (exports.itemInBucket > config.maxItemPerBucket) {
		exports.itemInBucket = 1;
		exports.currentBucket = exports.currentBucket % config.maxBuckets + 1;
	}

	persistentVariables.set('bucket_number', exports.currentBucket);
	persistentVariables.set('bucket_index', exports.itemInBucket);

	return exports.currentBucket;
};
