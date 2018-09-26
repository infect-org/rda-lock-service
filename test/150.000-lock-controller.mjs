import section from 'section-tests';
import HTTP2Client from '@distributed-systems/http2-client';
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
        const client = new HTTP2Client();
        await service.load();

        const lockResponse = await client.post(`${host}:${service.getPort()}/rda-lock.lock`)
            .expect(201)
            .send({
                identifier: lockIdentifier,
                ttl: 60,
            });

        const data = await lockResponse.getData();

        assert(data);
        assert(data.identifier);
        assert.equal(data.identifier, lockIdentifier);

        lockId = data.id;

        await section.wait(200);
        await service.end();
        await client.end();
    });



    section.test('Create the same lock again', async() => {
        const service = new Service();
        const client = new HTTP2Client();
        await service.load();

        await client.post(`${host}:${service.getPort()}/rda-lock.lock`)
            .expect(409)
            .send({
                identifier: lockIdentifier,
                ttl: 60,
            });

        await section.wait(200);
        await service.end();
    });



    section.test('Free the lock', async() => {
        const service = new Service();
        const client = new HTTP2Client();
        await service.load();

        const lockResponse = await client.delete(`${host}:${service.getPort()}/rda-lock.lock/${lockId}`)
            .expect(200)
            .send();

        const data = await lockResponse.getData();

        assert(data);
        assert(data.identifier);
        assert.equal(data.identifier, lockIdentifier);
        assert(data.deleted);

        await section.wait(200);
        await service.end();
        await client.end();
    });



    section.test('Let a lock time out', async() => {
        section.setTimeout(3000);

        const client = new HTTP2Client();
        const service = new Service({
            stallLockTestInterval: 1000,
        });
        await service.load();

        const lockCreateResponse = await client.post(`${host}:${service.getPort()}/rda-lock.lock`)
            .expect(201).send({
                identifier: lockIdentifier,
                ttl: 1,
            });

        const data = await lockCreateResponse.getData();


        await section.wait(2000);
        await client.delete(`${host}:${service.getPort()}/rda-lock.lock/${data.id}`)
            .expect(404)
            .send();

        await section.wait(200);
        await service.end();
        await client.end();
    });


    section.destroy(async() => {
        await sm.stopServices();
    });
});
