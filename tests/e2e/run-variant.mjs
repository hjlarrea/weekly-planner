import { runPlannerFlowSuite, setupDistVariant, setupDockerVariant, setupSourceVariant } from "../helpers/e2e.mjs";

const variant = process.argv[2];

const setups = {
  src: setupSourceVariant,
  dist: setupDistVariant,
  docker: setupDockerVariant,
};

if (!setups[variant]) {
  console.error(`Unknown e2e variant: ${variant}`);
  process.exit(1);
}

runPlannerFlowSuite(setups[variant])
  .then(() => {
    console.log(`E2E ${variant} passed.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
