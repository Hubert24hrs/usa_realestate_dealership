/** Runs saved-search + price-drop alerts once (same logic as /api/cron/alerts). npm run alerts:run */
import { runAlerts } from "../src/server/alerts";

runAlerts()
  .then((summary) => {
    console.log("Alerts run:", summary);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
