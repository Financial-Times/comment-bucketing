# Troubleshooting

## Health
The health page will tell you if any of it’s dependencies are stopping it functioning correctly: http://comment-bucketing-prod.herokuapp.com/__health .
If you cannot connect to this URL at all the problem is probably a networking/CDN/DNS one although it is possible that all services have died.

### No connection to the health page
Try to restart the heroku dynos.

### Worker process died or no connection
Try to restart the heroku dynos.

## PostgreSQL
Try to connect to the database using the following command

```
psql {url}
```

Where {url} is the URL field from here: https://postgres.heroku.com/databases/comment-bucketing-prod-database .

If you cannot connect to it, try to restart the service from the heroku dashboard.

If there is a connection, verify if the table exists:

```
\dt
```

There should be a 'variables' table.
If it doesn't exist, create it with the following table:

```
create table variables (name char(100) PRIMARY KEY NOT NULL, value bigint NOT NULL);
```

Restart the heroku dynos.

## Livefyre ActivityStream API
If the activity stream is not available, email prioritysupport@livefyre.com.

## Livefyre content tag API
If the Livefyre content tag API is not available, email prioritysupport@livefyre.com.
