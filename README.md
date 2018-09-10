# RDA Lock Service

Provides a central place for locking resources for RDA. Is mainly consumed by 
the cluster service when updating the cluster with new data or when adding or 
removing nodes in order to prevent parallel execution of such actions.

Please use the lock [client](https://www.npmjs.com/package/@infect/rda-lock-client) for interactions with this service!


## API

### POST /lock.lock Create a lock

Create a lock for a resource with an identifier. The lock will clear itself 
after a specified amount of seconds (ttl).

payload:
```javascript
{
	identifier: 'cluster-34'
	ttl: 10 // 10 seconds
}
```

Responses:
- 201: lock could be created. The payload contains the id of the lock that can be used to free it later
- 409: the lock is already in use
- 500: server error



### DELETE /lock.lock/{id} Free a lock

Frees the lock with an id.


Responses:
- 200: the lock was freed
- 404: the lock could not be found and was maybe freed earlier, possibly by a timeout
- 500: server error