exports.up = (knex) =>
  knex.schema.createTable('document_shares', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('permission', ['view', 'edit'], { useNative: true, enumName: 'share_permission' })
      .notNullable()
      .defaultTo('view');
    t.timestamps(true, true);
    t.unique(['document_id', 'user_id']);
    t.index(['user_id']);
  });

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('document_shares');
  await knex.raw('DROP TYPE IF EXISTS share_permission');
};
