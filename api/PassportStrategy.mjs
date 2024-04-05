import bcrypt from "bcryptjs";
import passportLocal from "passport-local";

const LocalStrategy = passportLocal.Strategy;

export function PassportStrategy(db) {
    return new LocalStrategy(
        async (username, password, done) => {
            const user = await db.getUserByUsername(username);
            if (!user) {
                return done(null, false, {message: "Incorrect username."});
            }
            if (!bcrypt.compareSync(password, user.password_hash)) {
                return done(null, false, {message: "Incorrect password."});
            }
            return done(null, user);
        }
    )
}

export function PassportSerializeUser() {
    return (user, done) => {
        done(null, user.id);
    }
}

export function PassportDeserializeUser(db) {
    return async (id, done) => {
        const user = await db.getUserById(id);
        delete user.password_hash;
        done(null, user);
    }
}