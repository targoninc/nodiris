import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from "passport";
import {DB} from "./api/DB.mjs";
import session from "express-session";
import {PassportDeserializeUser, PassportSerializeUser, PassportStrategy} from "./api/PassportStrategy.mjs";
import {AuthActions} from "./api/AuthActions.mjs";
import dotenv from "dotenv";
import {UserActions} from "./api/UserActions.mjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session({}));
app.use(express.json());

const db_url = process.env.MYSQL_URL.toString();
console.log(`Connecting to database at url ${db_url}...`);
const db = new DB(process.env.MYSQL_URL);
await db.connect();

passport.use(PassportStrategy(db));
passport.serializeUser(PassportSerializeUser());
passport.deserializeUser(PassportDeserializeUser(db));

app.post("/api/authorize", AuthActions.authorizeUser(db));
app.post("/api/logout", AuthActions.logout());
app.get("/api/isAuthorized", AuthActions.isAuthorized(db));
app.post("/api/saveAvatar", AuthActions.checkAuthenticated, UserActions.saveAvatar(db));

app.use(express.static(path.join(__dirname, '/ui')));

app.listen(3001, () => {
    console.log('Server listening at http://localhost:3001/');
});