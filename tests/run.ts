// Import every suite explicitly: node:test runs them and propagates failures.
import "./devnet-client.test";
import "./reader.test";

import "./app.test";

import "./production.test";
import "./devnet-program.test";

import "./build-record.test";

import "./dependencies.test";

import "./metadata.test";

import "./rehearsal-plan.test";
import "./rehearsal-rent.test";
import "./rehearsal-one-tx.test";
import "./rehearsal-spl-one-tx.test";
import "./rehearsal-vesting-one-tx.test";

import "./metadata-production.test";

import "./robusto.test";

import "./robusto-production.test";
import "./robusto-owner-preparation.test";

import "./robusto-launch-policy.test";
