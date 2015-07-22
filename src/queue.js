"use strict";

var Queue = function () {
	var items = [];

	this.push = function (fcn) {
		items.push(fcn);
		next();
	};


	var running = false;
	var next = function () {
		if (!running) {
			if (items.length) {
				running = true;

				var fcn = items.shift();
				fcn(function () {
					running = false;
					next();
				});
			}
		}
	};
};
module.exports = Queue;
