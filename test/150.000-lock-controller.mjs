import section from 'section-tests';
import superagent from 'superagent';
import assert from 'assert';
import ServiceManager from '@infect/rda-service-manager';
import Service from '../index.mjs';



const host = 'http://l.dns.porn';



section('Lock Controller', (section) => {
    let sm;
    let lockId;
    const lockIdentifier = `lock-${Math.round(Math.random() * 1000000)}`;


    section.setup(async() => {
        sm = new ServiceManager({
            args: '--dev --log-level=error+ --log-module=*'.split(' '),
        });

        await sm.startServices('rda-service-registry');
    });



    section.test('Create a lock', async() => {
        const service = new Service();
        await service.load();

        const lockResponse = await superagent.post(`${host}:${service.getPort()}/rda-lock.lock`).ok(res => res.status === 201).send({
            identifier: lockIdentifier,
            ttl: 60,
        });

        assert(lockResponse.body);
        assert(lockResponse.body.identifier);
        assert.equal(lockResponse.body.identifier, lockIdentifier);

        lockId = lockResponse.body.id;

        await section.wait(200);
        await service.end();
    });



    section.test('Create the same lock again', async() => {
        const service = new Service();
        await service.load();

        await superagent.post(`${host}:${service.getPort()}/rda-lock.lock`).ok(res => res.status === 409).send({
            identifier: lockIdentifier,
            ttl: 60,
        });

        await section.wait(200);
        await service.end();
    });



    section.test('Free the lock', async() => {
        const service = new Service();
        await service.load();

        const lockResponse = await superagent.delete(`${host}:${service.getPort()}/rda-lock.lock/${lockId}`).ok(res => res.status === 200).send();

        assert(lockResponse.body);
        assert(lockResponse.body.identifier);
        assert.equal(lockResponse.body.identifier, lockIdentifier);
        assert(lockResponse.body.deleted);

        await section.wait(200);
        await service.end();
    });



    section.test('Let a lock time out', async() => {
        section.setTimeout(3000);

        const service = new Service({
            stallLockTestInterval: 1000,
        });
        await service.load();

        const lockCreateResponse = await superagent.post(`${host}:${service.getPort()}/rda-lock.lock`).ok(res => res.status === 201).send({
            identifier: lockIdentifier,
            ttl: 1,
        });

        await section.wait(2000);
        await superagent.delete(`${host}:${service.getPort()}/rda-lock.lock/${lockCreateResponse.body.id}`).ok(res => res.status === 404).send();

        await section.wait(200);
        await service.end();
    });


    section.destroy(async() => {
        await sm.stopServices();
    });
});
