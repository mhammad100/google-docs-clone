exports.up = (knex) =>
  knex.schema.createTable('documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 200).notNullable().defaultTo('Untitled document');
    // Editor.js output: { time, blocks: [...], version }
    t.jsonb('content').notNullable().defaultTo(JSON.stringify({ blocks: [] }));
    t.timestamps(true, true);
    t.index(['owner_id', 'updated_at']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('documents');
