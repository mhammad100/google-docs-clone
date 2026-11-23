const bcrypt = require('bcryptjs');

// Demo accounts. Every account uses the same password so reviewers can switch quickly.
const DEMO_PASSWORD = 'password123';
const USERS = [
  { name: 'Alice Johnson', email: 'alice@example.com' },
  { name: 'Bob Smith', email: 'bob@example.com' },
  { name: 'Carol Lee', email: 'carol@example.com' },
];

exports.seed = async (knex) => {
  await knex('document_shares').del();
  await knex('documents').del();
  await knex('users').del();

  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = await knex('users')
    .insert(USERS.map((u) => ({ ...u, password_hash })))
    .returning(['id', 'email']);
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));

  const [welcome] = await knex('documents')
    .insert({
      owner_id: byEmail['alice@example.com'],
      title: 'Project kickoff notes',
      content: JSON.stringify({
        blocks: [
          { type: 'header', data: { text: 'Project kickoff', level: 1 } },
          { type: 'paragraph', data: { text: 'This doc is <b>owned by Alice</b> and <i>shared with Bob</i> as an editor.' } },
          { type: 'header', data: { text: 'Goals', level: 2 } },
          {
            type: 'list',
            data: {
              style: 'unordered',
              meta: {},
              items: [
                { content: 'Ship the editor', meta: {}, items: [] },
                { content: 'Support <u>sharing</u>', meta: {}, items: [] },
              ],
            },
          },
        ],
      }),
    })
    .returning(['id']);

  await knex('documents').insert({
    owner_id: byEmail['bob@example.com'],
    title: "Bob's private draft",
    content: JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'Only Bob can see this until he shares it.' } }],
    }),
  });

  await knex('document_shares').insert({
    document_id: welcome.id,
    user_id: byEmail['bob@example.com'],
    permission: 'edit',
  });
};
