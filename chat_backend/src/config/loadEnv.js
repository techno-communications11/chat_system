import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const loadEnv = () => dotenv.config({ path: path.join(backendRoot, ".env") });

export default loadEnv;
