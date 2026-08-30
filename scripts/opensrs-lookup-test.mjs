#!/usr/bin/env node
/**
 * Test LOOKUP OpenSRS — équivalent du quickstart Python officiel.
 * Usage (PowerShell) :
 *   $env:OPENSRS_USERNAME="votre_user"
 *   $env:OPENSRS_API_KEY="votre_cle"
 *   $env:OPENSRS_TEST="true"
 *   node scripts/opensrs-lookup-test.mjs mon-salon-test.com
 *
 * @see https://domains.opensrs.guide/docs/quickstart
 */

import { createHash } from "node:crypto";

const TEST_MODE = process.env.OPENSRS_TEST !== "false";
const domain = process.argv[2] || "myfirstopensrsapitest.com";

const connectionOptions = {
  live: {
    reseller_username: process.env.OPENSRS_USERNAME,
    api_key: process.env.OPENSRS_API_KEY,
    api_host_port: "https://rr-n1-tor.opensrs.net:55443",
  },
  test: {
    reseller_username: process.env.OPENSRS_USERNAME,
    api_key: process.env.OPENSRS_API_KEY,
    api_host_port: "https://horizon.opensrs.net:55443",
  },
};

const connection = TEST_MODE ? connectionOptions.test : connectionOptions.live;

if (!connection.reseller_username || !connection.api_key) {
  console.error("Définissez OPENSRS_USERNAME et OPENSRS_API_KEY.");
  process.exit(1);
}

const xml = `<?xml version='1.0' encoding='UTF-8' standalone='no' ?>
<!DOCTYPE OPS_envelope SYSTEM 'ops.dtd'>
<OPS_envelope>
<header>
    <version>0.9</version>
</header>
<body>
<data_block>
    <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">LOOKUP</item>
        <item key="object">DOMAIN</item>
        <item key="attributes">
         <dt_assoc>
                <item key="domain">${domain}</item>
         </dt_assoc>
        </item>
    </dt_assoc>
</data_block>
</body>
</OPS_envelope>`;

function md5Hex(input) {
  return createHash("md5").update(input, "utf8").digest("hex");
}

const signature = md5Hex(md5Hex(xml + connection.api_key) + connection.api_key);

console.log(`Request to ${connection.api_host_port} as reseller ${connection.reseller_username}:`);
console.log(xml);

const res = await fetch(`${connection.api_host_port}/`, {
  method: "POST",
  headers: {
    "Content-Type": "text/xml",
    "X-Username": connection.reseller_username,
    "X-Signature": signature,
  },
  body: xml,
});

console.log("\nResponse:");
console.log(`HTTP ${res.status}`);
console.log(await res.text());
