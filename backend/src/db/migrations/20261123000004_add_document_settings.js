// Page setup per document: size, orientation, margins, header/footer (see services/settings.service.js)
exports.up = (knex) =>
  knex.schema.alterTable('documents', (t) => {
    t.jsonb('settings').notNullable().defaultTo('{}');
  });

exports.down = (knex) =>
  knex.schema.alterTable('documents', (t) => {
    t.dropColumn('settings');
  });
