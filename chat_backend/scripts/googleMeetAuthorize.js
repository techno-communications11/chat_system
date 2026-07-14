import { authenticateGoogleMeet } from "../src/Servicess/googleMeet.services.js";

try {
  await authenticateGoogleMeet({ forceBrowser: true });
  console.log("Google Meet authorization succeeded. token.json has been saved.");
} catch (error) {
  console.error(`${error.code || "GOOGLE_MEET_AUTH_FAILED"}: ${error.message}`);
  if (error.details) console.error(error.details);
  process.exitCode = 1;
}
