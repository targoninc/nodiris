import session from "express-session";
import passport from "passport";
import {DB} from "./DB.mjs";
import {PassportDeserializeUser, PassportSerializeUser, PassportStrategy} from "./PassportStrategy.mjs";
import {AuthActions} from "./AuthActions.mjs";
import {UserActions} from "./UserActions.mjs";
import {CLI} from "./CLI.mjs";
import {GraphActions} from "./GraphActions.mjs";
import express from "express";

export class Features {
    static async enableAuthentication(app) {
        const neededEnvVarsForAuth = ["SESSION_SECRET", "MYSQL_URL", "MYSQL_USER", "MYSQL_PASSWORD"];
        const missingEnvVars = neededEnvVarsForAuth.filter((envVar) => !process.env[envVar]);

        app.use(express.json());
        app.post("/api/authenticationEnabled", AuthActions.authenticationEnabled(missingEnvVars.length === 0));

        if (missingEnvVars.length > 0) {
            CLI.warn(`Disabling authentication features because of missing environment variables: ${missingEnvVars.join(", ")}`);
            return;
        }

        app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false
        }));
        app.use(passport.initialize());
        app.use(passport.session({}));

        const db_url = process.env.MYSQL_URL.toString();
        CLI.rewrite(`Connecting to database @ ${db_url}...`);
        const db = new DB(process.env.MYSQL_URL);
        await db.connect();
        CLI.rewrite("Connected to database.");

        passport.use(PassportStrategy(db));
        passport.serializeUser(PassportSerializeUser());
        passport.deserializeUser(PassportDeserializeUser(db));

        app.post("/api/authorize", AuthActions.authorizeUser(db));
        app.post("/api/logout", AuthActions.logout());
        app.get("/api/isAuthorized", AuthActions.isAuthorized(db));
        app.post("/api/saveAvatar", AuthActions.checkAuthenticated, UserActions.saveAvatar(db));

        app.get("/api/getUserGraphs", AuthActions.checkAuthenticated, GraphActions.getUserGraphs(db));
        app.get("/api/getGraph", AuthActions.checkAuthenticated, GraphActions.getGraph(db));
        app.post("/api/saveGraph", AuthActions.checkAuthenticated, GraphActions.saveGraph(db));
        app.post("/api/deleteGraph", AuthActions.checkAuthenticated, GraphActions.deleteGraph(db));
    }
}