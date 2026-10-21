const { Client } = require("pg");

const regions = [
  "aws-0-ap-southeast-1",
  "aws-0-ap-southeast-2",
  "aws-0-ap-northeast-1",
  "aws-0-ap-south-1",
  "aws-0-us-east-1",
  "aws-0-us-west-1",
  "aws-0-eu-central-1",
  "aws-0-eu-west-1",
];

const user = "postgres.dczahftqsmfakfpthdog";
const password = "3fAjJLXjcIkauoh3";

async function checkRegion(region) {
  const host = `${region}.pooler.supabase.com`;
  // Test port 6543 (transaction pooler) and 5432 (session pooler)
  const client = new Client({
    host,
    port: 6543,
    user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const res = await client.query("SELECT current_database(), current_user;");
    await client.end();
    return { region, success: true, data: res.rows[0] };
  } catch (err) {
    try { await client.end(); } catch (e) {}
    return { region, success: false, error: err.message };
  }
}

async function main() {
  for (const r of regions) {
    process.stdout.write(`Testing ${r}... `);
    const res = await checkRegion(r);
    if (res.success) {
      console.log(`\n>>> SUCCESS! Connected to ${r}! <<<`);
      console.log(res.data);
      process.exit(0);
    } else {
      console.log(`Failed: ${res.error}`);
    }
  }
  console.log("None matched.");
}

main();
