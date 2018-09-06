import RDAService from 'rda-service';
import Related from 'related';
import RelatedTimestamps from 'related-timestamps';
import log from 'ee-log';

import LockController from './controller/LockController.mjs';



/**
 * The lock service provides locking functionality for RDA. This is required for cluster operations
 * like scaling the cluster or adding or removing data from it, which cannot be executed in
 * parallel.
 */
export default class LockService extends RDAService {


    /**
     * set up the service
     *
     * @param      {Object}  arg1                        options
     * @param      {number}  arg1.stallLockTestInterval  The stall lock test interval
     */
    constructor({
        stallLockTestInterval,
    } = {}) {
        super('rda-lock');

        this.stallLockTestInterval = stallLockTestInterval;
    }




    /**
     * initializes the service:
     * 1. load the db
     * 2. register controllers
     * 3. start the web server via the super class
     * 4. register the service at the service registry
     *
     * @return     {Promise}    undefined
     */
    async load() {

        // set up the database, enable soft deletes
        this.related = new Related(this.config.db);
        this.related.use(new RelatedTimestamps());

        await this.related.load();
        this.db = this.related[this.config.db.schema];

        const lockController = new LockController({
            db: this.db,
            registryClient: this.registryClient,
            stallLockTestInterval: this.stallLockTestInterval,
        });

        // regularly clean stalled locks
        lockController.startStallLockInterval();

        // register the controllers on the service which
        // will make them publicly accessible
        this.registerController(lockController);

        // start the service and the web server
        await super.load();

        // register at the service registry so that the
        // service is discoverable for other services
        await this.registerService();
    }




    /**
     * shut down the service
     *
     * @return     {Promise}  undefined
     */
    async end() {
        await this.controllers.get('lock').end();
        await super.end();
        await this.related.end();
    }
}
