"use strict";

var config = {};

config.networkSecret = process.env.networkSecret || '';
config.networkName = process.env.networkName || '';
config.maxBuckets = process.env.maxBuckets || 50;
config.maxItemPerBucket = process.env.maxItemPerBucket || 20;
config.commentIdsCacheLifetime = process.env.commentIdsCacheLifetime || 7200; // default 2h lifetime
config.rabbitUrl = process.env.RABBITMQ_BIGWIG_URL || 'amqp://localhost';
config.databaseUrl = process.env.DATABASE_URL || "postgres://postgres:admin@localhost/comment_bucketing";

module.exports = config;
