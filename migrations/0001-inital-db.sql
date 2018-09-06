drop schema if exists rda_lock_service cascade;
create schema  if not exists rda_lock_service;

set search_path to rda_lock_service;


create table rda_lock_service."lock" (
    id serial not null,
    identifier varchar(100) not null,
    "ttl" int not null,
    "created" timestamp without time zone not null default now(),
    "updated" timestamp without time zone not null default now(),
    "deleted" timestamp without time zone,
    constraint "lock_pk"
        primary key (id)
);


create unique index "lock_unique_identifier"
    on "rda_lock_service"."lock"("identifier")
    where "deleted" is null;