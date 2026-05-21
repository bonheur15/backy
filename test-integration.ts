const host = 'http://localhost:3000';

async function test() {
  console.log('1. Fetch projects');
  let res = await fetch(`${host}/api/projects`);
  let data = await res.json();
  console.log('Projects:', data);

  const projectName = `test-project-${Date.now()}`;
  console.log(`\n2. Create new project: ${projectName}`);
  res = await fetch(`${host}/api/projects/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectName })
  });
  data = await res.json();
  console.log('Create result:', data);

  console.log('\n3. Open project');
  res = await fetch(`${host}/api/projects/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: data.path })
  });
  data = await res.json();
  console.log('Open result:', data);

  // Wait for bun install to finish...
  console.log('\nWaiting 5s for install to run...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('\n4. Init Git');
  res = await fetch(`${host}/api/git/init`, { method: 'POST' });
  console.log('Git init:', await res.json());

  console.log('\n5. Save Metadata (Logic Block + DB + Endpoint)');
  res = await fetch(`${host}/api/metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gitAutoCommit: true,
      dbModels: [{
        id: 'model_user',
        name: 'users',
        columns: [
          { name: 'id', type: 'number', primaryKey: true },
          { name: 'email', type: 'string' }
        ],
        position: { x: 100, y: 100 }
      }],
      logicBlocks: [{
        id: 'block_hash',
        name: 'hashPassword',
        isFavorite: true,
        inputs: [{ name: 'pwd', type: 'string' }],
        outputs: [{ name: 'hashed', type: 'string' }],
        logic: 'return { hashed: pwd + "_hashed" };',
        position: { x: 300, y: 100 }
      }],
      endpoints: [{
        id: 'post_register',
        name: 'register',
        method: 'post',
        path: '/register',
        inputs: {
          query: [],
          body: [{ name: 'email', type: 'string' }, { name: 'password', type: 'string' }]
        },
        outputs: {
          response: [{ name: 'success', type: 'boolean' }]
        },
        logic: `
const { hashed } = logic.hashPassword(body.password);
const newUser = await db.insert(schema.users).values({ email: body.email }).returning();
return { success: true, user: newUser[0], hash: hashed };
        `,
        position: { x: 100, y: 300 }
      }]
    })
  });
  console.log('Metadata save result:', await res.json());

  // Check files
  console.log('\n6. Fetch files list');
  res = await fetch(`${host}/api/files`);
  console.log('Files:', await res.json());

  console.log('\n7. Git status');
  res = await fetch(`${host}/api/git/status`);
  console.log('Git status:', await res.json());

  console.log('\nAll tests completed.');
}

test().catch(console.error);
