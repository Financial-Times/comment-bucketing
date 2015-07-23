# Description
This service listens on the comments stream and applies tags to the comments to split them in groups for the moderators.

## The idea of bucketing
There are several moderators who read the comments. In order to efficiently split their work, the comments are categorized into buckets. The moderators can split the comments by reading different buckets. There are in total 50 buckets, each of them with a maximum of 20 comments.

When a new comment is posted, it is assigned a tag (e.g. bucket1). For the following 19 comments the same bucket tag is assigned. After this the current bucket is considered to be full, so a new bucket is started (e.g. bucket2).

When the 50th bucket becomes full, the whole process starts over from bucket1.

## Technical details
### Platform
The application is a Node.js app.

### Infrastructure
There are two processes: a web process which provides the endpoints for health, metrics, etc., and a worker process which continously listens on the comments stream.

The communication between the two processes are done by a queing engine named RabbitMQ.

### Livefyre APIs
There are used a couple of Livefyre APIs:

1. Activity stream: <a href="http://answers.livefyre.com/developers/api-reference/#link-activity-stream" target="_blank">http://answers.livefyre.com/developers/api-reference/#link-activity-stream</a>
2. Content tag: <a href="http://answers.livefyre.com/developers/api-reference/#link-tag" target="_blank">http://answers.livefyre.com/developers/api-reference/#link-tag</a>

### Storage
PostgreSQL is used to persist the bucket state and the last event id and last comment id consumed from the activity stream.


### Deployment

**Don't commit directly to the 'master' branch, create feature branches and pull requests.**
