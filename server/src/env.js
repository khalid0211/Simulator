import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env before any other local module is imported. ES module imports are
// evaluated before the importing file's own top-level code, so dotenv must
// live in its own file that gets imported first — otherwise modules that read
// process.env.X at the top level (e.g. `const ADMIN_KEY = process.env...`)
// would see it before the .env file has been loaded.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
