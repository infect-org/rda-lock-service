import { Controller } from '@infect/rda-service';
import log from 'ee-log';
import assert from 'assert';




/**
 * Provides lock functionality for RDA
 */
export default class LockController extends Controller {

    /**
     * set up the class
     *
     * @param      {Object}            arg1                        options
     * @param      {Related.Database}  arg1.db                     the related db object for the
     *                                                             lock database
     * @param      {RegistryClient}    arg1.registryClient         The RDA registry client
     * @param      {Number}            arg1.stallLockTestInterval  The stall lock test interval
     */
    constructor({
        db,
        registryClient,
        stallLockTestInterval = 60 * 1000,
    }) {
        super('lock');

        this.registryClient = registryClient;
        this.db = db;
        this.Related = this.db.getORM();

        // the amount milliseconds to wait between stalled lock cleaning
        this.stallLockTestInterval = stallLockTestInterval;

        this.enableAction('create');
        this.enableAction('delete');
        this.enableAction('listOne');
    }




    /**
     * returns one lock, if available
     *
     * @param      {<type>}   request  The request
     * @return     {Promise}  { description_of_the_return_value }
     */
    async listOne(request) {
        const identifier = request.getParameter('id');

        const lock = await this.db.lock('*', {
            identifier,
        }).raw().findOne();

        if (lock) {
            return lock;
        } else {
            await request.response().status(404).send();
        }
    }




    /**
     * try to create a new lock for a given resource, returns a 200 OK it it could allocate the
     * lock, else 409 conflict if the lock is already taken.
     *
     * @param      {HTTP2Request}   request   The request
     * @return     {Promise}           response data
     */
    async create(request) {
        const data = await request.getData();

        assert(typeof data === 'object', 'Missing request body Expected an object containing an identifier and a TTL');
        assert(typeof data.identifier === 'string' && data.identifier, 'Missing string identifier in request body');
        assert(typeof data.ttl === 'number' && data.ttl > 0, 'Missing number ttl in request body');

        const { identifier, ttl } = data;

        // try to create the lock, if it fails with an unique
        // constraint error the lock is already in use
        return new this.db.lock({
            identifier,
            ttl,
        }).save().catch((err) => {
            if (err.code === 'uniqueDuplicateKey') {
                request.response().status(409).send(`The lock ${identifier} is already in use!`);
            } else throw err;
        });
    }




    /**
     * free an existing lock which requires the correct lock id
     *
     * @param      {HTTP2Request}   request   The request
     * @return     {Promise}           response data
     */
    async delete(request) {
        const id = request.getParameter('id');
        assert(!(/[^0-9]/.test(id)), 'Invalid parameter id, expected a number!');

        // try to create the lock, if it fails with an unique
        // constraint error the lock is already in use
        const lock = await this.db.lock('*', {
            id: Number.parseInt(id, 10),
        }).findOne();

        if (lock) {
            return lock.delete();
        } else {
            request.response().status(404).send(`Could not free lock with id ${id}, the lock could not be found!`);
        }
    }




    /**
     * Starts the stalled lock checking
     */
    startStallLockInterval() {
        clearInterval(this.stallInterval);

        this.stallInterval = setInterval(() => {
            this.clearStalledLocks().catch(log);
        }, this.stallLockTestInterval);
    }





    /**
     * clears locks that are older than its TTL value
     *
     * @return     {Promise}  undefined
     */
    async clearStalledLocks() {
        const locks = await this.db.lock('*').find();

        for (const lock of locks) {

            // clear the lock because the lock is older than the TTL
            if (lock.updated.getTime() + (lock.ttl * 1000) < Date.now()) {
                await lock.delete();
            }
        }
    }





    /**
     * stop all operations on the controller
     *
     * @return     {Promise}  undefined
     */
    async end() {
        clearInterval(this.stallInterval);
    }
}
