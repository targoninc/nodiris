import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import {Features} from "./api/Features.mjs";
import {CLI} from "./api/CLI.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
await Features.enableAuthentication(app);
CLI.clear();

app.use(express.static(path.join(__dirname, '/ui')));

app.listen(3001, () => {
    CLI.success('Server listening at http://localhost:3001/');
});
